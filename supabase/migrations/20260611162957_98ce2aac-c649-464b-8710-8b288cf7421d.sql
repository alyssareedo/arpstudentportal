
-- Restore simple SELECT policy on profiles (notes column already removed)
DROP VIEW IF EXISTS public.my_profile;
CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Replace SECURITY DEFINER view with an RPC that returns safe columns only
DROP VIEW IF EXISTS public.toeic_questions_public;

CREATE OR REPLACE FUNCTION public.get_toeic_questions()
RETURNS TABLE (
  id uuid,
  section toeic_section,
  difficulty toeic_difficulty,
  prompt text,
  options jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, section, difficulty, prompt, options
  FROM public.toeic_questions
$$;

REVOKE ALL ON FUNCTION public.get_toeic_questions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_toeic_questions() TO authenticated;
