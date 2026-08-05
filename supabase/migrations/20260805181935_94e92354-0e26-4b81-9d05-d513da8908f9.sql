CREATE OR REPLACE VIEW public.toeic_questions_safe
WITH (security_invoker = off) AS
  SELECT id, section, difficulty, prompt, options
  FROM public.toeic_questions;

REVOKE ALL ON public.toeic_questions_safe FROM PUBLIC, anon;
GRANT SELECT ON public.toeic_questions_safe TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_toeic_questions()
RETURNS TABLE(id uuid, section public.toeic_section, difficulty public.toeic_difficulty, prompt text, options jsonb)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT id, section, difficulty, prompt, options
  FROM public.toeic_questions_safe
$function$;

REVOKE ALL ON FUNCTION public.get_toeic_questions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_toeic_questions() TO authenticated, service_role;