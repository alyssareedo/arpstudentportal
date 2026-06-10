
CREATE TABLE public.course_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lessons_count integer NOT NULL CHECK (lessons_count > 0),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_packages_student ON public.course_packages(student_id, start_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_packages TO authenticated;
GRANT ALL ON public.course_packages TO service_role;

ALTER TABLE public.course_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own packages"
  ON public.course_packages FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Admins manage packages"
  ON public.course_packages FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER course_packages_touch
  BEFORE UPDATE ON public.course_packages
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
