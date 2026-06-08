# Migration Guide — Move to a Brand-New Supabase Project

This app uses Supabase for **database, auth, storage, and edge functions**.
After completing the steps below you will only need to swap four values to
fully detach from the old project:

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
SUPABASE_SERVICE_ROLE_KEY   (edge function secret, set in dashboard)
```

No code in the repo hardcodes the old project ref — everything is driven by
env vars and the SQL files in `supabase/`.

---

## 1. Create the new Supabase project

1. Sign in at https://supabase.com/dashboard and click **New project**.
2. Pick a region and a strong DB password.
3. From **Project Settings → API** copy:
   - **Project URL** → goes into `VITE_SUPABASE_URL`
   - **Project ref** (the subdomain part) → goes into `VITE_SUPABASE_PROJECT_ID`
   - **anon / publishable key** → goes into `VITE_SUPABASE_PUBLISHABLE_KEY`
   - **service_role key** → goes into the edge function secret
     `SUPABASE_SERVICE_ROLE_KEY` (never commit it to the repo).
4. Install the Supabase CLI: https://supabase.com/docs/guides/cli

---

## 2. Apply the database schema

Every migration lives in `supabase/migrations/` and must run **in filename
order**. A concatenated copy is also available at
`supabase/FULL_SCHEMA.sql` for one-shot pasting into the SQL editor.

**Option A — CLI (recommended):**

```bash
supabase link --project-ref <new-project-ref>
supabase db push
```

**Option B — SQL editor:**
Open `supabase/FULL_SCHEMA.sql`, paste into Dashboard → SQL Editor, run.

### What the migrations create

**Enums**
- `app_role` — `admin`, `student`, `teacher`
- `attendance_status` — `present`, `absent`, `late`, `scheduled`
- `booking_status` — `pending`, `approved`, `declined`, `cancelled`
- `cefr_level` — `A1`, `A2`, `B1`, `B2`, `C1`, `C2`
- `toeic_difficulty` — `beginner`, `intermediate`, `advanced`
- `toeic_section` — `listening`, `reading`, `vocabulary`, `grammar`, `business_english`

**Tables (all in `public`, all RLS-enabled with GRANTs)**
- `profiles` — student/teacher profile, 1:1 with `auth.users`
- `user_roles` — role assignments (separate table to prevent privilege escalation)
- `lessons` — scheduled/past lessons with attendance + meeting links
- `scores` — monthly skill scores per student
- `homework` — assignments with completion tracking
- `availability_slots` — teacher recurring availability
- `bookings` — student lesson requests with approval workflow
- `cefr_assessments` — free CEFR test submissions
- `toeic_questions` — question bank
- `toeic_assessments` — TOEIC attempts with per-section scores + CEFR mapping
- `toeic_assessment_answers` — per-question answer log
- `assessment_comments` — teacher/admin notes on assessments

**Functions**
- `public.has_role(_user_id uuid, _role app_role) → boolean` (SECURITY DEFINER)
- `public.handle_new_user()` — trigger fn; first signup becomes `admin`, rest `student`
- `public.touch_updated_at()` — generic `updated_at` trigger fn

**Triggers**
- `on_auth_user_created` on `auth.users` AFTER INSERT → `handle_new_user()`
- `updated_at` triggers on tables that have an `updated_at` column

**Indexes, foreign keys, RLS policies, and GRANTs** are all included in the
migration files — no manual follow-up needed.

**Realtime:** the app does not subscribe to any realtime channels, so no
publication changes are required. If you later want realtime on a table, add
it to the `supabase_realtime` publication from the dashboard.

---

## 3. Create the storage bucket

In **Storage → New bucket**:

| Bucket    | Public | Purpose                  |
| --------- | ------ | ------------------------ |
| `avatars` | ✅      | Profile avatar uploads   |

No custom storage policies are needed beyond the default public-read.

---

## 4. Configure authentication

In **Authentication → Providers / URL Configuration**:

1. **Email** provider — enabled (default).
2. **Confirm email** — leave **on**. The app does not assume auto-confirm.
3. **Disable new signups** — **off** (students self-register; the very first
   account automatically becomes `admin` via the `handle_new_user` trigger).
4. **Site URL** — your production URL.
5. **Additional Redirect URLs** — add your production URL **and**
   `http://localhost:8080` so password reset works in local dev.
6. (Recommended) Enable **Password HIBP check** under Email settings.
7. (Optional) Enable the Google provider if you want social login.

---

## 5. Deploy the edge functions

Three functions live in `supabase/functions/`:

| Function                 | Purpose                                         | Needs `SERVICE_ROLE_KEY` | Needs `LOVABLE_API_KEY` |
| ------------------------ | ----------------------------------------------- | ------------------------ | ----------------------- |
| `admin-create-student`   | Admin creates a student account                 | ✅                       | ❌                      |
| `seed-students`          | Populate demo students                          | ✅                       | ❌                      |
| `seed-toeic-questions`   | Generate ~100 TOEIC questions via Lovable AI    | ❌                       | ✅                      |

Deploy:

```bash
supabase functions deploy admin-create-student
supabase functions deploy seed-students
supabase functions deploy seed-toeic-questions
```

Set secrets (**Project Settings → Edge Functions → Secrets**):

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` —
  auto-provided by Supabase, no action needed.
- `LOVABLE_API_KEY` — required by `seed-toeic-questions`. If you're moving
  off Lovable entirely, swap it for your own LLM provider (e.g.
  `OPENAI_API_KEY`) and update
  `supabase/functions/seed-toeic-questions/index.ts`.

---

## 6. Wire up environment variables

Create `.env` at the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in:

```env
VITE_SUPABASE_URL="https://<new-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<new-anon-key>"
VITE_SUPABASE_PROJECT_ID="<new-project-ref>"
```

For any hosting provider (Vercel, Netlify, etc.) set the same three vars in
its dashboard.

Also update `supabase/config.toml` if you plan to use the Supabase CLI from
this repo — change `project_id = "..."` to your new project ref.

---

## 7. First run

```bash
bun install
bun run dev
```

1. Sign up — the first account becomes **admin** automatically.
2. Go to **Assessments → Seed question bank** to populate `toeic_questions`.
3. (Optional) Call `seed-students` from the dashboard to add demo data.

---

## 8. Final checklist

- [ ] New Supabase project created.
- [ ] `supabase/FULL_SCHEMA.sql` (or all files in `supabase/migrations/`) run
      successfully — every table visible in dashboard.
- [ ] `avatars` storage bucket created (public).
- [ ] Auth Site URL + redirect URLs configured (prod + `localhost:8080`).
- [ ] All three edge functions deployed.
- [ ] `LOVABLE_API_KEY` (or replacement LLM key) added as an edge function secret.
- [ ] `.env` updated with new `VITE_SUPABASE_URL`,
      `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
- [ ] `supabase/config.toml` `project_id` updated (if using the CLI).
- [ ] First admin signed up; row appears in `public.user_roles` with role `admin`.
- [ ] TOEIC question bank seeded.
- [ ] App loads, login works, lessons / bookings / assessments all read & write.
- [ ] Old Supabase project can now be paused or deleted — nothing in the
      codebase references its project ref anymore.
