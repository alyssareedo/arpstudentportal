# Resumable TOEIC attempts

## Goal
Prevent TOEIC answers from being lost when a student refreshes or closes the app, without changing existing completed assessments.

## Implementation
- Add secure backend operations to:
  - create or resume the signed-in student's latest incomplete TOEIC attempt;
  - store the exact selected question set for that attempt;
  - upsert each selected answer as the student works;
  - return only the student's own incomplete answers and sanitized question content;
  - finalize that same attempt only when the student submits.
- Keep answer keys and score fields server-controlled. Students will not receive correct answers or gain direct write access to final scores.
- Update the TOEIC test page to:
  - resume the latest incomplete attempt automatically;
  - restore its selected sections, question order, answers, and current position;
  - autosave each answer and visibly report save failures;
  - submit the existing attempt for server-side scoring instead of creating a second record.
- Preserve all existing completed assessments and answer-review behavior. Completed attempts remain excluded from resume and remain read-only to students.

## Technical details
- Apply a database migration for the minimum attempt metadata and uniqueness needed for reliable answer upserts.
- Extend the existing TOEIC grading function to accept an owned incomplete attempt, verify its saved questions and answers, calculate section scores/total/CEFR, and atomically mark it complete.
- Add a dedicated authenticated edge function for starting, resuming, and autosaving attempts using server-side authorization.
- Deploy the functions, then verify build status and exercise start → answer → refresh → resume → submit in the live preview.
