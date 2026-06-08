# Backup & Recovery Guide

This document is a complete disaster-recovery plan. If the original Supabase
project becomes permanently inaccessible, follow these steps to rebuild the
entire backend in a brand-new Supabase project from the files in this repo.

---

## 1. Backup Package Contents

Everything required to rebuild is committed to the repo:

| Asset | Location |
|---|---|
| Consolidated schema (one-shot) | `supabase/FULL_SCHEMA.sql` |
| Individual migrations (chronological) | `supabase/migrations/*.sql` |
| Edge functions | `supabase/functions/<name>/index.ts` |
| Seed scripts (run as edge functions) | `supabase/functions/seed-students`, `supabase/functions/seed-toeic-questions` |
| Storage bucket definitions | inside `FULL_SCHEMA.sql` (`storage.buckets` + `storage.objects` policies) |
| Frontend Supabase client | `src/integrations/supabase/client.ts` (env-driven) |
| Env template | `.env.example` |
| Supabase CLI config | `supabase/config.toml` |

### Migrations included (run in this exact order)

```
20260523173229_*  initial schema (profiles, user_roles, lessons, scores, homework, has_role, handle_new_user, triggers)
20260523173241_*  RLS hardening, private.has_role, GRANT cleanup
20260524154519_*  storage bucket `avatars` + object policies
20260524154606_*  profile extras (gender, course_start_date, lessons_purchased)
20260525144904_*  teacher role + availability_slots
20260525150029_*  bookings + booking_status enum + realtime publication
20260527052636_*  cefr_assessments
20260527052709_*  cefr_assessments policies
20260528133318_*  cefr_assessments index/cleanup
20260607124713_*  TOEIC system (toeic_questions, toeic_assessments, toeic_assessment_answers, assessment_comments)
```

### Edge functions

| Function | Purpose | Required secrets |
|---|---|---|
| `admin-create-student` | Admin-only: create auth user + profile | `SUPABASE_SERVICE_ROLE_KEY` (auto) |
| `seed-students` | Dev seed: bulk create demo students | `SUPABASE_SERVICE_ROLE_KEY` (auto) |
| `seed-toeic-questions` | Generate ~100 TOEIC questions via LLM | `LOVABLE_API_KEY` (or your own LLM key) |

---

## 2. Environment Variables

### Frontend (`.env` at project root)

```env
VITE_SUPABASE_URL="https://<new-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<new-anon-or-publishable-key>"
VITE_SUPABASE_PROJECT_ID="<new-project-ref>"
```

`VITE_SUPABASE_ANON_KEY` is accepted as a legacy alias.

### Edge function secrets (Supabase Dashboard → Edge Functions → Secrets)

Auto-provided by the Supabase runtime (do not set manually):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

You must set:
- `LOVABLE_API_KEY` — required by `seed-toeic-questions`. If leaving Lovable, replace with your own LLM provider key (e.g. `OPENAI_API_KEY`) and update the function's fetch URL/headers.

### `supabase/config.toml`

Update the single line:
```toml
project_id = "<new-project-ref>"
```

---

## 3. Recovery Procedure (from zero)

### Step 1 — Create a new Supabase project
1. Go to https://supabase.com/dashboard → **New project**.
2. Save the project ref, anon/publishable key, and service role key.

### Step 2 — Install Supabase CLI (optional but recommended)
```bash
npm i -g supabase
supabase login
supabase link --project-ref <new-project-ref>
```

### Step 3 — Apply the database schema

**Option A — one-shot (fastest):**
1. Open Supabase Dashboard → SQL Editor.
2. Paste the entire contents of `supabase/FULL_SCHEMA.sql`.
3. Run.

**Option B — replay individual migrations (preferred for fidelity):**
```bash
supabase db push
```
This runs every file in `supabase/migrations/` in filename order.

### Step 4 — Create storage bucket
The `avatars` bucket is created by `FULL_SCHEMA.sql` / migration `20260524154519`.
If it did not get created, run in SQL editor:
```sql
insert into storage.buckets (id, name, public) values ('avatars','avatars',true);
```
RLS policies for `storage.objects` are also in the same migration.

### Step 5 — Configure Authentication
Dashboard → **Authentication → Providers**:
- Enable **Email** (password sign-in).
- (Recommended) Enable **Google** OAuth and add your client ID/secret.
- **Confirm email**: ON (production) / OFF (dev convenience).
- **Allow new sign-ups**: OFF — students are created by admins via the `admin-create-student` edge function. The very first user you create becomes admin automatically (see `handle_new_user` trigger).

Dashboard → **Authentication → URL Configuration**:
- **Site URL**: your deployed app URL.
- **Redirect URLs**: add your dev URL (e.g. `http://localhost:5173/**`) and production URL.

Optional hardening: enable **Leaked password protection (HIBP)**.

### Step 6 — Deploy edge functions
```bash
supabase functions deploy admin-create-student
supabase functions deploy seed-students
supabase functions deploy seed-toeic-questions
```

Then set secrets:
```bash
supabase secrets set LOVABLE_API_KEY=<your-key>
```

### Step 7 — Realtime
The bookings + lessons realtime publication is created by migration
`20260525150029_*`. No manual configuration needed.

### Step 8 — Update local env + CLI config
1. Edit `.env` with the new `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
2. Edit `supabase/config.toml` → set `project_id` to the new ref.
3. Restart the dev server.

### Step 9 — Create the first admin
1. Sign up via the app's `/auth` page (or use the dashboard → Authentication → Add user).
2. The `handle_new_user` trigger assigns the **admin** role to the first user.
3. All subsequent users default to **student** until promoted via `user_roles`.

### Step 10 — Seed the TOEIC question bank
1. Log in as admin.
2. Navigate to **Assessments** in the sidebar.
3. Click **Seed question bank** — this invokes `seed-toeic-questions`.

### Step 11 — (Optional) Seed demo students
Invoke `seed-students` from the dashboard or via:
```bash
curl -X POST "https://<new-project-ref>.functions.supabase.co/seed-students" \
  -H "Authorization: Bearer <service-role-key>"
```

---

## 4. Post-Recovery Checklist

- [ ] New Supabase project created
- [ ] All 10 migrations applied (or `FULL_SCHEMA.sql` run)
- [ ] `avatars` storage bucket exists and is public
- [ ] Storage object policies present (owner-scoped upload/update/delete)
- [ ] Email auth enabled; (optional) Google OAuth configured
- [ ] New sign-ups disabled; redirect URLs set
- [ ] 3 edge functions deployed
- [ ] `LOVABLE_API_KEY` (or substitute) set in edge function secrets
- [ ] `.env` updated and dev server restarts cleanly
- [ ] `supabase/config.toml` `project_id` updated
- [ ] First user created → confirmed as admin in `public.user_roles`
- [ ] TOEIC bank seeded (≥100 rows in `public.toeic_questions`)
- [ ] Smoke test: log in, view dashboard, create a lesson, take CEFR test, take TOEIC test, view PDF report

---

## 5. Ongoing Backup Recommendations

- **Database**: enable Supabase **Point-in-Time Recovery** (Pro plan) or schedule nightly `pg_dump`:
  ```bash
  pg_dump "$SUPABASE_DB_URL" -Fc -f backup-$(date +%F).dump
  ```
- **Storage**: periodically mirror the `avatars` bucket:
  ```bash
  supabase storage download --recursive avatars ./backup/avatars
  ```
- **Code**: this repo IS the source of truth for schema + functions — keep it in git, tag releases.
- **Secrets**: store `SUPABASE_SERVICE_ROLE_KEY` and `LOVABLE_API_KEY` in a password manager.

---

## 6. What lives ONLY in Supabase (not in this repo)

These cannot be recovered from code — back them up separately:
- Actual row data (users, profiles, lessons, assessments, etc.) → use `pg_dump`.
- Files inside the `avatars` storage bucket → use `supabase storage download`.
- Auth users (`auth.users` table) → exportable via dashboard or `pg_dump` of the `auth` schema.

Everything else (schema, policies, functions, triggers, buckets, edge functions, frontend) is fully reproducible from this repo.
