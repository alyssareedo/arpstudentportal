
REVOKE EXECUTE ON FUNCTION public.has_teacher_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_teacher_access(uuid) TO authenticated, service_role;
