GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_teacher_access(uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.has_teacher_access(uuid) FROM PUBLIC, anon;