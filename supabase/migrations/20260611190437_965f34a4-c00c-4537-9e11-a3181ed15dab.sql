
CREATE TABLE public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.course_packages(id) ON DELETE SET NULL,
  package_name text NOT NULL,
  lessons_total integer NOT NULL DEFAULT 0,
  lessons_used integer NOT NULL DEFAULT 0,
  amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'THB',
  starts_at date NOT NULL DEFAULT CURRENT_DATE,
  expires_at date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX idx_course_enrollments_student ON public.course_enrollments(student_id);
CREATE INDEX idx_course_enrollments_status ON public.course_enrollments(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_enrollments TO authenticated;
GRANT ALL ON public.course_enrollments TO service_role;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage all enrollments" ON public.course_enrollments FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Students view their own enrollments" ON public.course_enrollments FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE TRIGGER trg_course_enrollments_updated_at BEFORE UPDATE ON public.course_enrollments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, student_id)
);
CREATE INDEX idx_teacher_assignments_teacher ON public.teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_student ON public.teacher_assignments(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_assignments TO authenticated;
GRANT ALL ON public.teacher_assignments TO service_role;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage teacher assignments" ON public.teacher_assignments FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Teachers view their own assignments" ON public.teacher_assignments FOR SELECT TO authenticated USING (teacher_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_teacher_access(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.teacher_assignments WHERE teacher_id = auth.uid() AND student_id = _student_id)
$$;

CREATE POLICY "Teachers view assigned student profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_teacher_access(id));
CREATE POLICY "Teachers view assigned student lessons" ON public.lessons FOR SELECT TO authenticated USING (public.has_teacher_access(student_id));
CREATE POLICY "Teachers update assigned student lessons" ON public.lessons FOR UPDATE TO authenticated USING (public.has_teacher_access(student_id)) WITH CHECK (public.has_teacher_access(student_id));
CREATE POLICY "Teachers view assigned student homework" ON public.homework FOR SELECT TO authenticated USING (public.has_teacher_access(student_id));
CREATE POLICY "Teachers manage assigned student homework" ON public.homework FOR ALL TO authenticated USING (public.has_teacher_access(student_id)) WITH CHECK (public.has_teacher_access(student_id));
CREATE POLICY "Teachers view assigned student scores" ON public.scores FOR SELECT TO authenticated USING (public.has_teacher_access(student_id));
CREATE POLICY "Teachers view assigned student bookings" ON public.bookings FOR SELECT TO authenticated USING (public.has_teacher_access(student_id));
CREATE POLICY "Teachers view assigned student enrollments" ON public.course_enrollments FOR SELECT TO authenticated USING (public.has_teacher_access(student_id));
