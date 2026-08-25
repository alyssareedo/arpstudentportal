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
        $cron$select net.http_post(
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