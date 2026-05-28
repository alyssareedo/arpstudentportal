CREATE TABLE public.cefr_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  full_name text NOT NULL,
  age integer,
  learner_type text,
  filled_by text,
  phone text NOT NULL,
  line_id text,
  main_goal text,
  course_interest text,
  self_level text,
  goal_level text,
  speech_confidence integer,
  urgency text,
  website text,
  answers jsonb,
  score_grammar integer DEFAULT 0,
  score_vocabulary integer DEFAULT 0,
  score_reading integer DEFAULT 0,
  score_listening integer DEFAULT 0,
  total_score integer DEFAULT 0,
  total_questions integer DEFAULT 0,
  cefr_level text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.cefr_assessments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cefr_assessments TO authenticated;
GRANT ALL ON public.cefr_assessments TO service_role;

ALTER TABLE public.cefr_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a CEFR test"
ON public.cefr_assessments FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins view all CEFR assessments"
ON public.cefr_assessments FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view their own CEFR assessments"
ON public.cefr_assessments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins manage CEFR assessments"
ON public.cefr_assessments FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));