# ARP Speak — Implementation Plan

This is a large scope. I'll deliver it in **5 phases** so each phase ships safely without breaking what's live. Please approve the plan, then I'll suggest we tackle phases one at a time (or all at once if you prefer).

---

## Phase 0 — Audit (no code changes)

Before any schema changes, I'll verify what already exists vs. what's new:

- Existing tables in use: `profiles`, `user_roles` (admin/student/teacher enum already supports teacher), `lessons`, `homework`, `scores`, `bookings`, `availability_slots`, `course_packages`, `cefr_assessments`, `toeic_assessments`, `toeic_questions`, `toeic_assessment_answers`, `assessment_comments`, `student_notes`.
- Existing edge functions: `admin-create-student`, `seed-students`, `seed-toeic-questions`, `grade-toeic`.
- Existing pages already cover: CEFR test, TOEIC test + result, bookings, availability, schedule, students, lessons, reports, settings, profiles, admin assessments.

**Gaps to fill** (the actual work):
1. Teacher role UI + RLS (role exists; UI/policies don't fully use it)
2. LINE integration (not present)
3. Course renewal flow + history (packages exist; renewal UI doesn't)
4. Demo data expansion (currently 12 students, need 20 + 2 teachers w/ rich history)
5. TOEFL scaffolding (tables only, no UI)
6. Exportable PDF/Excel reports (current reports are screen-only)

---

## Phase 1 — Teacher role + Renewals

**Schema additions** (additive, no breaking changes):
- `course_enrollments` table: student_id, package_id, lessons_total, lessons_used, starts_at, expires_at, status, purchased_at, amount_paid. Replaces ad-hoc `lessons_purchased` on profile (kept for backward compat).
- `teacher_assignments` table: teacher_id, student_id, assigned_at.
- RLS: teachers can SELECT students/lessons/homework/scores **only** where a matching `teacher_assignments` row exists. Uses a `has_teacher_access(student_id)` security-definer function to avoid recursion.

**UI**:
- New admin page `/renewals` — list enrollments per student, "Add new package" dialog, history table.
- Teacher dashboard: filtered Students/Schedule/Homework pages (reuse existing pages, gated by role).
- Sidebar: third role variant for teacher.

---

## Phase 2 — LINE integration

**Schema**:
- Add `line_user_id`, `line_notifications_enabled` to `profiles`.
- New `line_settings` table (single row, admin-only) for channel access token + admin group ID.
- New `notification_log` table for delivery audit.

**Edge functions** (new):
- `line-send` — generic push (uses Messaging API, secret `LINE_CHANNEL_ACCESS_TOKEN`).
- Hooks invoked from existing flows: CEFR submit, TOEIC submit (`grade-toeic`), booking create, homework feedback, course expiry cron.

**Admin Settings page**: section to paste/update LINE tokens (stored as Lovable Cloud secrets via the secrets tool, not in DB).

I'll need you to add **`LINE_CHANNEL_ACCESS_TOKEN`** and **`LINE_ADMIN_USER_ID`** (or group ID) when we get to this phase.

---

## Phase 3 — Demo data + TOEFL scaffolding

- Extend `seed-students` to create 20 students with varied levels, plus 2 teachers, assignments, sample bookings, lessons, homework, scores, CEFR + TOEIC attempts.
- New tables: `toefl_assessments`, `toefl_questions`, `toefl_assessment_answers` mirroring TOEIC shape with sections (listening/reading/writing/speaking). RLS + grants. No UI yet — flag in admin settings says "coming soon".

---

## Phase 4 — Exportable reports

- Reuse existing `src/lib/toeic-pdf.ts` pattern (jsPDF) for: student transcript PDF, admin revenue PDF.
- Add Excel export via `xlsx` (already common) for tabular reports.
- New buttons on Reports + StudentDetail.

---

## Phase 5 — QA pass

- Run Supabase linter, security scan.
- Verify existing RLS unaffected.
- Smoke-test: admin login, student login, teacher login, CEFR submit, TOEIC submit, booking, renewal, LINE delivery (mock if no token yet).

---

## Technical notes

- All new tables follow the GRANT → RLS → POLICY pattern; teacher access via `has_teacher_access(uuid)` security-definer function (avoids recursion like existing `has_role`).
- No destructive migrations. `profiles.lessons_purchased` kept; new `course_enrollments` is source of truth going forward.
- LINE tokens stored as edge-function secrets, never in client code or DB plaintext.
- Cron for expiry alerts uses `pg_cron` + `pg_net` calling a new `check-expiries` edge function.

---

## Question before I start

Do you want me to **execute all 5 phases now in one go** (large, ~1 hour of build, several migrations for you to approve), or **ship phase by phase** so you can review each? I recommend phase-by-phase for a production app.
