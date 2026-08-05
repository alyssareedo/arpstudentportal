DROP FUNCTION IF EXISTS public.get_toeic_questions();
DROP VIEW IF EXISTS public.toeic_questions_safe;

CREATE OR REPLACE FUNCTION public.get_toeic_questions()
RETURNS TABLE(id uuid, section public.toeic_section, difficulty public.toeic_difficulty, prompt text, options jsonb)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT id, section, difficulty, prompt, options
  FROM public.toeic_questions
$function$;

REVOKE ALL ON FUNCTION public.get_toeic_questions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_toeic_questions() TO authenticated, service_role;

-- Column-level grants: answers/explanations unreadable via the API
REVOKE ALL ON public.toeic_questions FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, section, difficulty, prompt, options) ON public.toeic_questions TO authenticated;
GRANT ALL ON public.toeic_questions TO service_role;

DROP POLICY IF EXISTS "Staff read toeic questions" ON public.toeic_questions;
CREATE POLICY "Authenticated read sanitized toeic questions"
ON public.toeic_questions FOR SELECT TO authenticated
USING (true);