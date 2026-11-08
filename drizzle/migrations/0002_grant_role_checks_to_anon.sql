-- Allow the private role-check helpers to execute for the anon role.
-- When a browser session expires, requests reach the database as anon and
-- RLS policies calling these functions raised "permission denied for function
-- has_role" instead of cleanly denying access. The functions return false
-- when auth.uid() is null, so this exposes nothing.
GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO anon;
GRANT EXECUTE ON FUNCTION private.has_teacher_access(uuid) TO anon;