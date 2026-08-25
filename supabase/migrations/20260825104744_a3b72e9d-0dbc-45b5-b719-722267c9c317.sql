-- 1. Remove student write paths to TOEIC results
DROP POLICY IF EXISTS "Students insert own assessments" ON public.toeic_assessments;
DROP POLICY IF EXISTS "Students update own assessments" ON public.toeic_assessments;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.toeic_assessments FROM authenticated;
REVOKE ALL ON public.toeic_assessments FROM anon;
GRANT SELECT ON public.toeic_assessments TO authenticated;
GRANT ALL ON public.toeic_assessments TO service_role;

-- 2. Remove student write paths to TOEIC answer rows
DROP POLICY IF EXISTS "Students insert own answers" ON public.toeic_assessment_answers;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.toeic_assessment_answers FROM authenticated;
REVOKE ALL ON public.toeic_assessment_answers FROM anon;
GRANT SELECT ON public.toeic_assessment_answers TO authenticated;
GRANT ALL ON public.toeic_assessment_answers TO service_role;

-- 3. Question bank: no student writes; staff read via existing RLS policy
REVOKE ALL ON public.toeic_questions FROM authenticated;
REVOKE ALL ON public.toeic_questions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.toeic_questions TO authenticated; -- gated by RLS: staff read, admin manage
GRANT ALL ON public.toeic_questions TO service_role;