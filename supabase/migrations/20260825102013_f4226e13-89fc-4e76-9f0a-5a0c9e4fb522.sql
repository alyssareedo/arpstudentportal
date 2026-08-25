CREATE OR REPLACE FUNCTION public.get_cefr_review(_assessment_id uuid)
RETURNS TABLE(
  question_id uuid,
  level cefr_level,
  category text,
  prompt text,
  passage text,
  options jsonb,
  selected_answer integer,
  correct_answer integer,
  is_correct boolean,
  explanation text,
  sort_order integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.cefr_assessments a
    WHERE a.id = _assessment_id
      AND (
        (a.user_id IS NOT NULL AND a.user_id = auth.uid())
        OR private.has_role(auth.uid(), 'admin')
        OR private.has_role(auth.uid(), 'teacher')
      )
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT q.id, q.level, q.category, q.prompt, q.passage, q.options,
         ans.selected_answer, q.correct_answer, ans.is_correct, q.explanation, q.sort_order
  FROM public.cefr_assessment_answers ans
  JOIN public.cefr_questions q ON q.id = ans.question_id
  WHERE ans.assessment_id = _assessment_id
  ORDER BY q.sort_order;
END;
$$;

REVOKE ALL ON FUNCTION public.get_cefr_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cefr_review(uuid) TO authenticated, service_role;