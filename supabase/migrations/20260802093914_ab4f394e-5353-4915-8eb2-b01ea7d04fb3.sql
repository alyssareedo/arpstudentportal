-- 1. Move has_teacher_access into private schema (not exposed to API)
CREATE OR REPLACE FUNCTION private.has_teacher_access(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.teacher_assignments WHERE teacher_id = auth.uid() AND student_id = _student_id)
$$;
REVOKE ALL ON FUNCTION private.has_teacher_access(uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY "Teachers view assigned student profiles" ON public.profiles;
CREATE POLICY "Teachers view assigned student profiles" ON public.profiles FOR SELECT USING (private.has_teacher_access(id));

DROP POLICY "Teachers view assigned student lessons" ON public.lessons;
CREATE POLICY "Teachers view assigned student lessons" ON public.lessons FOR SELECT USING (private.has_teacher_access(student_id));

DROP POLICY "Teachers update assigned student lessons" ON public.lessons;
CREATE POLICY "Teachers update assigned student lessons" ON public.lessons FOR UPDATE USING (private.has_teacher_access(student_id)) WITH CHECK (private.has_teacher_access(student_id));

DROP POLICY "Teachers view assigned student homework" ON public.homework;
CREATE POLICY "Teachers view assigned student homework" ON public.homework FOR SELECT USING (private.has_teacher_access(student_id));

DROP POLICY "Teachers manage assigned student homework" ON public.homework;
CREATE POLICY "Teachers manage assigned student homework" ON public.homework FOR ALL USING (private.has_teacher_access(student_id)) WITH CHECK (private.has_teacher_access(student_id));

DROP POLICY "Teachers view assigned student scores" ON public.scores;
CREATE POLICY "Teachers view assigned student scores" ON public.scores FOR SELECT USING (private.has_teacher_access(student_id));

DROP POLICY "Teachers view assigned student bookings" ON public.bookings;
CREATE POLICY "Teachers view assigned student bookings" ON public.bookings FOR SELECT USING (private.has_teacher_access(student_id));

DROP POLICY "Teachers view assigned student enrollments" ON public.course_enrollments;
CREATE POLICY "Teachers view assigned student enrollments" ON public.course_enrollments FOR SELECT USING (private.has_teacher_access(student_id));

DROP POLICY "teacher read assigned students" ON public.material_assignments;
CREATE POLICY "teacher read assigned students" ON public.material_assignments FOR SELECT USING (private.has_teacher_access(student_id));

DROP POLICY "teacher read progress" ON public.material_progress;
CREATE POLICY "teacher read progress" ON public.material_progress FOR SELECT USING (private.has_teacher_access(student_id));

DROP POLICY "teacher read assigned invoices" ON public.invoices;
CREATE POLICY "teacher read assigned invoices" ON public.invoices FOR SELECT USING (private.has_teacher_access(student_id));

DROP FUNCTION public.has_teacher_access(uuid);

-- 2. TOEIC questions: no SECURITY DEFINER, answers hidden via column grants
CREATE OR REPLACE FUNCTION public.get_toeic_questions()
RETURNS TABLE(id uuid, section toeic_section, difficulty toeic_difficulty, prompt text, options jsonb)
LANGUAGE sql
STABLE SECURITY INVOKER
SET search_path = public
AS $$
  SELECT id, section, difficulty, prompt, options
  FROM public.toeic_questions
$$;
REVOKE ALL ON FUNCTION public.get_toeic_questions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_toeic_questions() TO authenticated, service_role;

REVOKE ALL ON public.toeic_questions FROM anon, authenticated;
GRANT SELECT (id, section, difficulty, prompt, options) ON public.toeic_questions TO authenticated;
GRANT ALL ON public.toeic_questions TO service_role;

DROP POLICY IF EXISTS "authenticated read toeic questions" ON public.toeic_questions;
CREATE POLICY "authenticated read toeic questions" ON public.toeic_questions FOR SELECT TO authenticated USING (true);

-- 3. Materials bucket: only admins/teachers may upload
DROP POLICY IF EXISTS "authenticated upload materials files" ON storage.objects;
CREATE POLICY "staff upload materials files" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'materials'
  AND (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'teacher'::app_role))
);