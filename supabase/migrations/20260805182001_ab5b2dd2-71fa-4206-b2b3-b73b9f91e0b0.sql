GRANT INSERT, UPDATE, DELETE ON public.toeic_questions TO authenticated;
GRANT SELECT (correct_answer, explanation, created_at) ON public.toeic_questions TO service_role;