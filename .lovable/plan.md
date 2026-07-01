
# ARP Speak — Upgrade Plan

Nothing existing is removed. All new features respect current roles (Admin / Teacher / Student) and RLS patterns.

---

## Phase 1 — Admin-Only Calendar Scheduler

**Behavior changes**
- Restrict `availability_slots` writes to Admin only. Teachers keep read access on their own slots. Students never write.
- Replace the current list-based Availability page with a **calendar UI** (day / week / month views) using `react-big-calendar`.
- Support: drag-to-create slots, drag-to-move, resize, recurring weekly slots, blocked date ranges (holidays), and manual lesson creation by admin (creates a confirmed `bookings` row bypassing the request flow).
- Add a new `availability_blocks` table (holiday / unavailable ranges).
- Admin can filter the calendar by teacher.

**Files**
- New: `src/pages/AdminCalendar.tsx` (replaces Availability entry point for admins; old page kept as fallback for teachers to view).
- New migration: `availability_blocks` table + tightened RLS on `availability_slots`.
- Update: `AppSidebar.tsx`, `App.tsx` routes.

## Phase 2 — Google Calendar Sync

- Use the existing Google Calendar connector (developer-account scope) for the school's shared calendar. Explain limitation: this syncs to the **school's** Google Calendar, not each teacher's personal one (per-user OAuth would require separate setup — offered as a follow-up).
- New Edge Function `google-calendar-sync` with actions: `push_slot`, `push_booking`, `delete_event`.
- Store `google_event_id` on `availability_slots` and `bookings`.
- Triggered on admin create / update / cancel actions.

## Phase 3 — Learning Materials Library

**Schema**
- `material_categories` (name, kind: cefr/skill/custom).
- `materials` (title, description, type: pdf/pptx/doc/image/audio/video/link, storage_path or external_url, category_id, cefr_level, objectives, lesson_plan, created_by).
- `material_assignments` (material_id, student_id nullable, course_id nullable, required boolean, due_date).
- `material_progress` (material_id, student_id, status: not_started/in_progress/completed, favorited, completed_at).
- New public Storage bucket `materials` (RLS: admin write, students read only files assigned to them via signed URLs from an Edge Function).

**UI**
- Admin: `src/pages/AdminMaterials.tsx` — upload, categorize, assign, edit, delete.
- Student: `src/pages/Materials.tsx` — assigned tab, browse tab, favorites, mark completed, progress bar.

## Phase 4 — Course Roadmap Dashboard

- New `src/pages/Roadmap.tsx` for students, `src/components/RoadmapView.tsx` reused inside `StudentDetail` for admins.
- Sections: completed lessons (from `lessons`), current progress, upcoming topics (from admin-planned future lessons / assigned materials with due dates), homework, recommended materials, remaining lessons (already computed), completion % = attended / purchased.
- Extend `lessons` with optional `planned_date` and `topic` (topic already exists).

## Phase 5 — Invoice & Payment System

**Schema**
- `invoices` (invoice_number auto, student_id, issue_date, due_date, package_name, lessons_count, lesson_duration_min, subtotal, discount, tax, total, status: pending/partial/paid/overdue/cancelled, notes, pdf_path).
- `invoice_payments` (invoice_id, amount, paid_at, method, proof_path, uploaded_by).
- New Storage bucket `invoices` (private; admin + owning student read).
- Auto-generate invoice number `ARP-YYYY-NNNN`.

**UI**
- Admin: `src/pages/AdminInvoices.tsx` — CRUD, filters (student/status/date/package), revenue summary, upload PDF, mark paid.
- Student: `src/pages/MyInvoices.tsx` — list, download, upload proof of payment, view history and renewal/expiration.

---

## Cross-cutting

- Every new list has admin **Delete** buttons using existing `ConfirmDeleteButton`.
- All pages responsive (Tailwind + existing shadcn components).
- Notification hooks: emit rows into an `outbound_notifications` table (already-planned LINE integration will consume these later). No LINE code added now.
- All migrations preserve existing data (additive only).

---

## Delivery order

I'll ship in this order, pausing for your confirmation between big phases so you can test:

1. Phase 1 (Admin Calendar) — smallest risk to current bookings flow.
2. Phase 5 (Invoices) — most requested for business ops.
3. Phase 3 (Materials Library).
4. Phase 4 (Roadmap) — depends on materials + lessons.
5. Phase 2 (Google Calendar sync) — requires connecting the Google Calendar connector; I'll prompt you at that point.

## Technical notes

- Calendar lib: `react-big-calendar` + `date-fns` localizer.
- Storage: signed URLs via Edge Function for private buckets.
- Invoice PDF generation reuses `jspdf` already in the project.
- Google Calendar via existing `google_calendar` connector (gateway pattern).

Reply **"go"** to start with Phase 1, or tell me to reorder / drop phases.
