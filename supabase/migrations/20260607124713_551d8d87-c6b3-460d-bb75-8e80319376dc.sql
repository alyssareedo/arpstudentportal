
-- Enums
CREATE TYPE public.toeic_section AS ENUM ('listening','reading','vocabulary','grammar','business_english');
CREATE TYPE public.toeic_difficulty AS ENUM ('beginner','intermediate','advanced');

-- Question bank
CREATE TABLE public.toeic_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section public.toeic_section NOT NULL,
  difficulty public.toeic_difficulty NOT NULL DEFAULT 'intermediate',
  prompt text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.toeic_questions TO authenticated;
GRANT ALL ON public.toeic_questions TO service_role;
ALTER TABLE public.toeic_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read questions" ON public.toeic_questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage questions" ON public.toeic_questions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Assessment attempts
CREATE TABLE public.toeic_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  score_listening int NOT NULL DEFAULT 0,
  score_reading int NOT NULL DEFAULT 0,
  score_vocabulary int NOT NULL DEFAULT 0,
  score_grammar int NOT NULL DEFAULT 0,
  score_business int NOT NULL DEFAULT 0,
  total_listening int NOT NULL DEFAULT 0,
  total_reading int NOT NULL DEFAULT 0,
  total_vocabulary int NOT NULL DEFAULT 0,
  total_grammar int NOT NULL DEFAULT 0,
  total_business int NOT NULL DEFAULT 0,
  total_correct int NOT NULL DEFAULT 0,
  total_questions int NOT NULL DEFAULT 0,
  toeic_score int NOT NULL DEFAULT 0,
  cefr_level text,
  strengths jsonb,
  weaknesses jsonb,
  recommendations text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.toeic_assessments TO authenticated;
GRANT ALL ON public.toeic_assessments TO service_role;
ALTER TABLE public.toeic_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own assessments" ON public.toeic_assessments
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students insert own assessments" ON public.toeic_assessments
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students update own assessments" ON public.toeic_assessments
  FOR UPDATE TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Teachers view assessments" ON public.toeic_assessments
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Admins manage assessments" ON public.toeic_assessments
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Per-question answers
CREATE TABLE public.toeic_assessment_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.toeic_assessments(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.toeic_questions(id) ON DELETE CASCADE,
  section public.toeic_section NOT NULL,
  selected_answer text,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.toeic_assessment_answers TO authenticated;
GRANT ALL ON public.toeic_assessment_answers TO service_role;
ALTER TABLE public.toeic_assessment_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own answers" ON public.toeic_assessment_answers
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.toeic_assessments a WHERE a.id = assessment_id AND a.student_id = auth.uid())
  );
CREATE POLICY "Students insert own answers" ON public.toeic_assessment_answers
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.toeic_assessments a WHERE a.id = assessment_id AND a.student_id = auth.uid())
  );
CREATE POLICY "Teachers view answers" ON public.toeic_assessment_answers
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'teacher'::app_role));
CREATE POLICY "Admins manage answers" ON public.toeic_assessment_answers
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Teacher/admin comments on an assessment (reusable for TOEFL later)
CREATE TABLE public.assessment_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_type text NOT NULL DEFAULT 'toeic',
  assessment_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_comments TO authenticated;
GRANT ALL ON public.assessment_comments TO service_role;
ALTER TABLE public.assessment_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view comments" ON public.assessment_comments
  FOR SELECT TO authenticated USING (
    private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'teacher'::app_role)
  );
CREATE POLICY "Staff insert comments" ON public.assessment_comments
  FOR INSERT TO authenticated WITH CHECK (
    author_id = auth.uid() AND (
      private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'teacher'::app_role)
    )
  );
CREATE POLICY "Authors update own comments" ON public.assessment_comments
  FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Admins manage comments" ON public.assessment_comments
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
