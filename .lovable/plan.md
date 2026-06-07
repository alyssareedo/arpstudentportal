
# Phase 1: TOEIC Placement Test

Building TOEIC end-to-end first. TOEFL and advanced features (Excel export, teacher study plans, comparison charts) come in later phases.

## What you'll get

- A full TOEIC Placement Test students can take from their dashboard
- 5 sections: Listening, Reading, Vocabulary, Grammar, Business English (~100 questions total, randomized per attempt)
- Auto-calculated TOEIC score (10–990) + CEFR equivalent (A1–C2)
- Results saved to the student's profile with section-by-section breakdown
- Printable PDF score report (strengths, weaknesses, recommendations)
- Admin & teacher view of all past results with filters
- New "Language Assessments" page for students (CEFR + TOEIC history with progress chart)

## User flows

**Student**
1. Sidebar → "Language Assessments" → sees CEFR + TOEIC history + progress chart
2. Clicks "Take TOEIC Placement Test" → randomized 100-question test with section progress bar
3. Submits → instant result screen (TOEIC score, CEFR level, per-section bars, strengths/weaknesses, study recommendations)
4. "Download PDF report" button

**Teacher / Admin**
1. Sidebar → "Assessments" → table of all TOEIC attempts
2. Filters: date range, student, CEFR level, TOEIC score range
3. Click row → full result + ability to add private comments/recommendations
4. PDF export per result

## Technical details

### Database (new migration)

- `toeic_questions` — question bank
  - `section` (listening | reading | vocabulary | grammar | business_english)
  - `difficulty` (beginner | intermediate | advanced)
  - `prompt`, `options` (jsonb array), `correct_answer`, `explanation`
- `toeic_assessments` — one row per attempt
  - `student_id`, `started_at`, `completed_at`
  - per-section scores + `total_correct`, `total_questions`
  - `toeic_score` (10–990), `cefr_level`
  - `strengths` / `weaknesses` (jsonb), `recommendations` (text)
- `toeic_assessment_answers` — per-question record (for review)
- `assessment_comments` — teacher/admin notes attached to an assessment (designed to also serve future TOEFL)

RLS: students read/insert own; teachers read all; admins full access. Standard GRANTs included.

### Question bank seeding

A one-time edge function `seed-toeic-questions` calls Lovable AI (Gemini) to generate ~100 TOEIC-style questions across the 5 sections and 3 difficulty tiers, then inserts them. Admin-only trigger button in Settings. Re-runnable to top up.

### Scoring logic (`src/lib/toeic-scoring.ts`)
- Listening + Reading each contribute up to 495 (TOEIC official range) using a simple linear map from % correct
- Vocabulary / Grammar / Business English roll into a composite that nudges Listening/Reading bands
- CEFR mapping: <225 A1, 225–549 A2, 550–784 B1, 785–944 B2, 945–989 C1, 990 C2
- Strengths = top 2 sections by %, weaknesses = bottom 2; recommendations generated from weak sections

### Pages & routes
- `/assessments` — student hub (CEFR + TOEIC history, line chart of TOEIC score over time)
- `/assessments/toeic` — test-taking flow (intake check → randomized questions → result)
- `/assessments/toeic/:id` — single result view + PDF download
- `/admin/assessments` — admin/teacher list with filters
- `/admin/assessments/:id` — admin/teacher detail view + comments

### PDF report
- Use `jspdf` + `jspdf-autotable` (lightweight, browser-side, no extra service)
- Includes logo, student info, total + section scores, CEFR badge, strengths/weaknesses, recommendations

### Sidebar updates
- Student: add "Language Assessments" (replaces standalone CEFR link, which becomes a card inside)
- Admin: add "Assessments" between Reports and Settings

### Files added
- `supabase/migrations/<timestamp>_toeic.sql`
- `supabase/functions/seed-toeic-questions/index.ts`
- `src/lib/toeic-scoring.ts`
- `src/lib/toeic-pdf.ts`
- `src/pages/Assessments.tsx`
- `src/pages/ToeicTest.tsx`
- `src/pages/ToeicResult.tsx`
- `src/pages/AdminAssessments.tsx`
- `src/pages/AdminAssessmentDetail.tsx`

### Files edited
- `src/App.tsx` (routes)
- `src/components/layout/AppSidebar.tsx` (nav items)

## Not in this phase (will follow)
- TOEFL test, writing AI grading
- Excel export
- Teacher-authored study plans (separate workflow)
- Cross-test comparison charts
