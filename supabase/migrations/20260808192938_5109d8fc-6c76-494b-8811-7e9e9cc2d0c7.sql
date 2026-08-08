ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS lesson_number integer,
  ADD COLUMN IF NOT EXISTS cycle_start date;

-- Backfill cycle_start: the latest package/reset start date on or before the lesson date
WITH cycles AS (
  SELECT student_id, starts_at::date AS d FROM public.course_enrollments
  UNION
  SELECT id, lessons_reset_at FROM public.profiles WHERE lessons_reset_at IS NOT NULL
  UNION
  SELECT id, course_start_date FROM public.profiles WHERE course_start_date IS NOT NULL
),
resolved AS (
  SELECT l.id,
         (SELECT max(c.d) FROM cycles c WHERE c.student_id = l.student_id AND c.d <= l.lesson_date) AS cs
  FROM public.lessons l
)
UPDATE public.lessons l SET cycle_start = r.cs
FROM resolved r WHERE r.id = l.id AND l.cycle_start IS NULL;

-- Backfill sequential numbering within each cycle
WITH numbered AS (
  SELECT id, row_number() OVER (
    PARTITION BY student_id, COALESCE(cycle_start, '1900-01-01'::date)
    ORDER BY lesson_date, lesson_time, created_at
  ) AS n
  FROM public.lessons
)
UPDATE public.lessons l SET lesson_number = numbered.n
FROM numbered WHERE numbered.id = l.id AND l.lesson_number IS NULL;