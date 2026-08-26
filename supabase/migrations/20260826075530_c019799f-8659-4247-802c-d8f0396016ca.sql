-- Explicitly scope EXECUTE on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.get_cefr_questions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cefr_questions() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_cefr_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_cefr_review(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_toeic_questions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_toeic_questions() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_toeic_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_toeic_review(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_shared_schedule(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_schedule(date, date) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_sheets_autosync() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_sheets_autosync() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.configure_sheets_autosync(boolean, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.configure_sheets_autosync(boolean, integer) TO authenticated, service_role;

-- Ensure no leftover permissive write policies remain on materials
DROP POLICY IF EXISTS "users insert own materials" ON public.materials;
DROP POLICY IF EXISTS "users update own materials" ON public.materials;
DROP POLICY IF EXISTS "users delete own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can insert their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can update their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can delete their own materials" ON public.materials;