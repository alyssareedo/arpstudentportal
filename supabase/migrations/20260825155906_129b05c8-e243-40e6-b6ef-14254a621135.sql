create extension if not exists pg_cron with schema cron;
create extension if not exists pg_net with schema extensions;

create table public.sheet_sync_targets (
  id uuid primary key default gen_random_uuid(),
  table_name text not null unique,
  spreadsheet_id text,
  tab_name text not null,
  enabled boolean not null default true,
  incremental boolean not null default true,
  last_synced_at timestamptz,
  last_row_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.sheet_sync_targets to authenticated;
grant all on public.sheet_sync_targets to service_role;
alter table public.sheet_sync_targets enable row level security;

create policy "Admins manage sync targets"
  on public.sheet_sync_targets for all to authenticated
  using (private.has_role(auth.uid(), 'admin'))
  with check (private.has_role(auth.uid(), 'admin'));

create trigger sheet_sync_targets_touch
  before update on public.sheet_sync_targets
  for each row execute function public.touch_updated_at();

create table public.sheet_sync_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  mode text not null default 'manual',
  sync_type text not null default 'incremental',
  tables_synced integer not null default 0,
  rows_pushed integer not null default 0,
  error text,
  details jsonb not null default '{}'::jsonb,
  triggered_by uuid,
  created_at timestamptz not null default now()
);

grant select on public.sheet_sync_runs to authenticated;
grant all on public.sheet_sync_runs to service_role;
alter table public.sheet_sync_runs enable row level security;

create policy "Admins read sync history"
  on public.sheet_sync_runs for select to authenticated
  using (private.has_role(auth.uid(), 'admin'));

create index sheet_sync_runs_started_idx on public.sheet_sync_runs (started_at desc);

-- shared secret used by the scheduled job to authenticate to the edge function
insert into public.app_settings (key, value)
values ('google_sheets_cron', jsonb_build_object('secret', encode(gen_random_bytes(24), 'hex'), 'enabled', false, 'minutes', 15))
on conflict (key) do nothing;

create or replace function public.configure_sheets_autosync(_enabled boolean, _minutes integer default 15)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_sched text;
begin
  if not private.has_role(auth.uid(), 'admin') then
    raise exception 'Admin only';
  end if;
  if _minutes < 5 or _minutes > 1440 then
    raise exception 'Interval must be between 5 and 1440 minutes';
  end if;

  select value->>'secret' into v_secret from public.app_settings where key = 'google_sheets_cron';

  perform cron.unschedule(jobid) from cron.job where jobname = 'sheets-auto-sync';

  if _enabled then
    if _minutes % 60 = 0 and _minutes >= 60 then
      v_sched := '0 */' || (_minutes / 60)::text || ' * * *';
    else
      v_sched := '*/' || _minutes::text || ' * * * *';
    end if;

    perform cron.schedule(
      'sheets-auto-sync',
      v_sched,
      format(
        $cron$select extensions.http_post(
          url := 'https://mvapzwmpicwxccbnekxo.supabase.co/functions/v1/sync-google-sheets',
          headers := jsonb_build_object('Content-Type','application/json','x-sync-secret',%L),
          body := '{"scheduled":true}'::jsonb
        );$cron$, v_secret)
    );
  end if;

  update public.app_settings
    set value = jsonb_build_object('secret', v_secret, 'enabled', _enabled, 'minutes', _minutes),
        updated_at = now()
  where key = 'google_sheets_cron';

  return jsonb_build_object('enabled', _enabled, 'minutes', _minutes);
end;
$$;

revoke all on function public.configure_sheets_autosync(boolean, integer) from public, anon;
grant execute on function public.configure_sheets_autosync(boolean, integer) to authenticated;

create or replace function public.get_sheets_autosync()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare v jsonb;
begin
  if not private.has_role(auth.uid(), 'admin') then
    raise exception 'Admin only';
  end if;
  select jsonb_build_object('enabled', coalesce((value->>'enabled')::boolean,false), 'minutes', coalesce((value->>'minutes')::int,15))
    into v from public.app_settings where key = 'google_sheets_cron';
  return coalesce(v, jsonb_build_object('enabled', false, 'minutes', 15));
end;
$$;

revoke all on function public.get_sheets_autosync() from public, anon;
grant execute on function public.get_sheets_autosync() to authenticated;