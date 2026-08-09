DROP POLICY IF EXISTS "Authenticated read sanitized toeic questions" ON public.toeic_questions;

CREATE POLICY "Staff read toeic questions"
ON public.toeic_questions FOR SELECT TO authenticated
USING (private.has_role(auth.uid(),'admin'::public.app_role) OR private.has_role(auth.uid(),'teacher'::public.app_role));

CREATE OR REPLACE FUNCTION public.get_toeic_questions()
RETURNS TABLE(id uuid, section public.toeic_section, difficulty public.toeic_difficulty, prompt text, options jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT q.id, q.section, q.difficulty, q.prompt, q.options
  FROM public.toeic_questions q
$function$;

REVOKE ALL ON FUNCTION public.get_toeic_questions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_toeic_questions() TO authenticated, service_role;