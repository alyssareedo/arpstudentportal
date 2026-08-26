DROP POLICY IF EXISTS "users insert own materials" ON public.materials;
DROP POLICY IF EXISTS "users update own materials" ON public.materials;
DROP POLICY IF EXISTS "users delete own materials" ON public.materials;

REVOKE EXECUTE ON FUNCTION public.get_cefr_review(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_toeic_review(uuid) FROM anon;