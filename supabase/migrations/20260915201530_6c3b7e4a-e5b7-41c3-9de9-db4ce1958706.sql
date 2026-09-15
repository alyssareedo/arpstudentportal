CREATE TABLE public.student_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_name text NOT NULL,
  provider text,
  test_date date NOT NULL DEFAULT current_date,
  score numeric,
  max_score numeric,
  cefr_level text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_test_results TO authenticated;
GRANT ALL ON public.student_test_results TO service_role;

ALTER TABLE public.student_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own test results"
ON public.student_test_results FOR SELECT TO authenticated
USING (student_id = auth.uid() OR private.has_role(auth.uid(),'admin') OR private.has_teacher_access(student_id));

CREATE POLICY "Staff insert test results"
ON public.student_test_results FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(),'admin') OR private.has_teacher_access(student_id));

CREATE POLICY "Staff update test results"
ON public.student_test_results FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(),'admin') OR private.has_teacher_access(student_id))
WITH CHECK (private.has_role(auth.uid(),'admin') OR private.has_teacher_access(student_id));

CREATE POLICY "Staff delete test results"
ON public.student_test_results FOR DELETE TO authenticated
USING (private.has_role(auth.uid(),'admin') OR private.has_teacher_access(student_id));

CREATE TRIGGER student_test_results_touch
BEFORE UPDATE ON public.student_test_results
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_student_test_results_student ON public.student_test_results(student_id, test_date DESC);

ALTER TABLE public.lessons
  ADD COLUMN quiz_name text,
  ADD COLUMN quiz_score numeric,
  ADD COLUMN quiz_max numeric;