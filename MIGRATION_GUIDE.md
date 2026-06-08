# Migration Guide — Move to a New Supabase Project

This app uses Supabase for database, auth, storage and edge functions. Follow
these steps to point it at a brand-new Supabase project.

---

## 1. Create the new Supabase project

1. Go to https://supabase.com/dashboard and create a new project.
2. Note the **Project URL** and **anon (publishable) key** from
   *Project Settings → API*. You'll also need the **service role key** for
   edge function secrets.
3. Install the Supabase CLI locally: https://supabase.com/docs/guides/cli

---

## 2. Required environment variables

### Frontend (`.env` at project root)

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | ✅ | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Anon / publishable key |
| `VITE_SUPABASE_PROJECT_ID` | optional | Only used for display/debug |

`VITE_SUPABASE_PUBLISHABLE_KEY` is still accepted as a fallback alias for
`VITE_SUPABASE_ANON_KEY`.

### Edge function secrets (set in Supabase dashboard → Edge Functions → Secrets)

| Secret | Provided by Supabase? | Notes |
| --- | --- | --- |
| `SUPABASE_URL` | auto | |
| `SUPABASE_ANON_KEY` | auto | |
| `SUPABASE_SERVICE_ROLE_KEY` | auto | |
| `LOVABLE_API_KEY` | ❌ | Required by `seed-toeic-questions` to call the Lovable AI Gateway. If you're leaving Lovable, swap the function over to your own LLM provider (e.g. `OPENAI_API_KEY`). |

A copy of these is in `.env.example`.

---

## 3. Run the SQL migrations

All schema lives in `supabase/migrations/` and must be applied **in
filename order**:

```
20260523173229_*.sql   -- profiles, user_roles, has_role(), handle_new_user trigger
20260523173241_*.sql
20260524154519_*.sql
20260524154606_*.sql
20260525144904_*.sql
20260525150029_*.sql
20260527052636_*.sql   -- availability_slots, bookings
20260527052709_*.sql
20260528133318_*.sql   -- cefr_assessments
20260607124713_*.sql   -- toeic_questions, toeic_assessments, toeic_assessment_answers, assessment_comments
```

Easiest path:

```bash
supabase link --project-ref <new-project-ref>
supabase db push
```

Or paste each file into the SQL editor in dashboard order.

These migrations create:

- **Tables**: `profiles`, `user_roles`, `lessons`, `scores`, `homework`,
  `availability_slots`, `bookings`, `cefr_assessments`, `toeic_questions`,
  `toeic_assessments`, `toeic_assessment_answers`, `assessment_comments`.
- **Enum**: `app_role` (`admin`, `student`, `teacher`).
- **Functions**: `has_role(uuid, app_role)`, `handle_new_user()`,
  `touch_updated_at()`.
- **Trigger**: `on_auth_user_created` on `auth.users` → `handle_new_user()`.
  The first user to sign up automatically becomes `admin`.
- **RLS policies + GRANTs** on every public table.

---

## 4. Create storage buckets

In *Storage* create:

| Bucket | Public | Purpose |
| --- | --- | --- |
| `avatars` | ✅ public | Profile avatar images |

No additional storage policies are required for the public `avatars` bucket
beyond the defaults.

---

## 5. Configure authentication

In *Authentication → Providers / Settings*:

1. **Email** provider: enabled.
2. **Confirm email**: leave **enabled** (the app does not require
   auto-confirm).
3. **Disable new sign-ups**: off (students self-register; first user becomes
   admin).
4. **Site URL** and **Redirect URLs**: add your deployed URL **and**
   `http://localhost:8080` so the password-reset flow works in dev.
5. (Recommended) Enable **Password HIBP check** under Email settings.
6. (Optional) Enable Google provider if you want social login.

---

## 6. Deploy edge functions

```bash
supabase functions deploy admin-create-student
supabase functions deploy seed-students
supabase functions deploy seed-toeic-questions
```

Then set the `LOVABLE_API_KEY` secret (or your replacement LLM key) in the
dashboard for `seed-toeic-questions`.

---

## 7. Update environment variables and run

```bash
cp .env.example .env
# edit .env with the new project values
bun install
bun run dev
```

Sign up the first account — it becomes the admin. From the admin UI:

1. Open **Assessments → Seed question bank** to populate `toeic_questions`.
2. (Optional) Invoke the `seed-students` function to create the demo
   students.

---

## 8. Post-migration checklist

- [ ] New Supabase project created and CLI linked.
- [ ] `.env` updated with new `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [ ] All SQL migrations applied in order; tables visible in dashboard.
- [ ] `avatars` storage bucket created and public.
- [ ] Auth providers, Site URL, and redirect URLs configured.
- [ ] `LOVABLE_API_KEY` (or replacement) set as edge function secret.
- [ ] All three edge functions deployed.
- [ ] First user signed up and confirmed as admin in `user_roles`.
- [ ] TOEIC question bank seeded.
- [ ] App loads, login works, lessons/bookings/assessments all read & write.
- [ ] Old Supabase project can be paused/deleted — nothing in the codebase
      references its project ref anymore.
