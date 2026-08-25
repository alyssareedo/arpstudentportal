CREATE OR REPLACE FUNCTION public.get_toeic_review(_assessment_id uuid)
RETURNS TABLE(
  question_id uuid,
  section toeic_section,
  prompt text,
  options jsonb,
  selected_answer text,
  correct_answer text,
  is_correct boolean,
  explanation text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.toeic_assessments a
    WHERE a.id = _assessment_id
      AND a.completed_at IS NOT NULL
      AND (
        a.student_id = auth.uid()
        OR private.has_role(auth.uid(), 'admin')
        OR private.has_role(auth.uid(), 'teacher')
      )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT q.id, q.section, q.prompt, q.options,
         ans.selected_answer, q.correct_answer, ans.is_correct, q.explanation
  FROM public.toeic_assessment_answers ans
  JOIN public.toeic_questions q ON q.id = ans.question_id
  WHERE ans.assessment_id = _assessment_id
  ORDER BY ans.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_toeic_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_toeic_review(uuid) TO authenticated, service_role;