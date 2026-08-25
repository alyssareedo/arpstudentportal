-- 1. Question bank
CREATE TABLE public.cefr_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id integer,
  level public.cefr_level NOT NULL,
  category text NOT NULL CHECK (category IN ('grammar','vocabulary','reading','listening')),
  prompt text NOT NULL,
  passage text,
  options jsonb NOT NULL,
  correct_answer integer NOT NULL,
  explanation text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cefr_questions TO authenticated;
GRANT ALL ON public.cefr_questions TO service_role;

ALTER TABLE public.cefr_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read cefr questions" ON public.cefr_questions
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'teacher'::public.app_role));

CREATE POLICY "Admins manage cefr questions" ON public.cefr_questions
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER cefr_questions_touch BEFORE UPDATE ON public.cefr_questions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. Seed the exact 30 existing questions
INSERT INTO public.cefr_questions (legacy_id, level, category, prompt, passage, options, correct_answer, sort_order) VALUES
(1,'A1','grammar','___ name is John.',NULL,'["I","My","Me","Mine"]'::jsonb,1,1),
(2,'A1','vocabulary','What colour is the sky on a clear day?',NULL,'["Red","Green","Blue","Yellow"]'::jsonb,2,2),
(3,'A1','grammar','She ___ a teacher.',NULL,'["am","is","are","be"]'::jsonb,1,3),
(4,'A1','reading','"Hello, I''m Anna. I''m from Italy." Where is Anna from?',NULL,'["Spain","Italy","France","Germany"]'::jsonb,1,4),
(5,'A1','listening','Which is a greeting?',NULL,'["Goodbye","Hello","Sorry","Please"]'::jsonb,1,5),
(6,'A2','grammar','Choose the correct sentence:',NULL,'["She don''t like coffee.","She doesn''t likes coffee.","She doesn''t like coffee.","She no like coffee."]'::jsonb,2,6),
(7,'A2','vocabulary','I usually ___ to work by bus.',NULL,'["go","going","goes","went"]'::jsonb,0,7),
(8,'A2','grammar','Yesterday I ___ to the cinema.',NULL,'["go","going","went","gone"]'::jsonb,2,8),
(9,'A2','reading','"The shop opens at 9am and closes at 6pm." How many hours is it open?',NULL,'["6","8","9","10"]'::jsonb,2,9),
(10,'A2','listening','"Could you repeat that, please?" The speaker wants you to:',NULL,'["Speak louder","Say it again","Stop talking","Translate"]'::jsonb,1,10),
(11,'B1','grammar','The weather is ___ today than yesterday.',NULL,'["cold","colder","more cold","coldest"]'::jsonb,1,11),
(12,'B1','vocabulary','I''m looking ___ to meeting you.',NULL,'["at","for","forward","up"]'::jsonb,2,12),
(13,'B1','grammar','If it rains tomorrow, we ___ stay home.',NULL,'["will","would","are","have"]'::jsonb,0,13),
(14,'B1','reading','"Please switch off your phone before the meeting starts." What should you do?',NULL,'["Call someone","Turn off the phone","Send a message","Charge it"]'::jsonb,1,14),
(15,'B1','listening','"I''d rather not go out tonight." The speaker:',NULL,'["Wants to go out","Prefers to stay in","Is already out","Is asking a question"]'::jsonb,1,15),
(16,'B2','grammar','By the time you arrive, I ___ dinner.',NULL,'["cook","cooked","will have cooked","am cooking"]'::jsonb,2,16),
(17,'B2','vocabulary','Her arguments were very ___ and convinced everyone.',NULL,'["weak","compelling","boring","confused"]'::jsonb,1,17),
(18,'B2','grammar','He suggested ___ a new approach.',NULL,'["to try","try","trying","tried"]'::jsonb,2,18),
(19,'B2','reading','What is the main idea?','Although coffee was once thought to be harmful, recent studies suggest that moderate consumption may have health benefits, including improved alertness and reduced risk of certain diseases.','["Coffee is harmful to health","Coffee may have some health benefits","Everyone should drink coffee","Coffee causes diseases"]'::jsonb,1,19),
(20,'B2','listening','"I couldn''t agree with you more." The speaker:',NULL,'["Strongly agrees","Strongly disagrees","Is unsure","Wants more information"]'::jsonb,0,20),
(21,'C1','grammar','Had I known earlier, I ___ differently.',NULL,'["would act","will act","would have acted","had acted"]'::jsonb,2,21),
(22,'C1','vocabulary','The findings ___ doubt on the original theory.',NULL,'["throw","cast","put","lay"]'::jsonb,1,22),
(23,'C1','grammar','Not only ___ late, but he also forgot the documents.',NULL,'["he was","was he","he is","is he"]'::jsonb,1,23),
(24,'C1','reading','The proposal is:','While the proposal has been widely lauded by industry experts, its implementation hinges on overcoming several entrenched regulatory hurdles.','["Already implemented","Praised but faces challenges","Rejected by experts","A regulatory failure"]'::jsonb,1,24),
(25,'C1','listening','"That''s a moot point." It means the point is:',NULL,'["Very important","Debatable or irrelevant","Clearly true","Funny"]'::jsonb,1,25),
(26,'C2','grammar','Seldom ___ such craftsmanship in modern furniture.',NULL,'["you see","do you see","you do see","have you saw"]'::jsonb,1,26),
(27,'C2','vocabulary','His remarks were widely seen as ___ — clever but unkind.',NULL,'["earnest","facetious","sycophantic","magnanimous"]'::jsonb,1,27),
(28,'C2','grammar','Were it not ___ your support, we would have failed.',NULL,'["for","to","by","of"]'::jsonb,0,28),
(29,'C2','reading','The author''s writing is:','The author''s prose, ostensibly straightforward, conceals layers of irony that only careful re-reading uncovers.','["Simple and clear","Apparently simple but deeply ironic","Confusing and badly written","Overtly sarcastic"]'::jsonb,1,29),
(30,'C2','listening','"He''s hoist with his own petard." This idiom means he:',NULL,'["Won a battle","Is harmed by his own scheme","Is very lucky","Got promoted"]'::jsonb,1,30);

-- 3. Sanitized reader for public/student use
CREATE OR REPLACE FUNCTION public.get_cefr_questions()
RETURNS TABLE(id uuid, level public.cefr_level, category text, prompt text, passage text, options jsonb, sort_order integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT q.id, q.level, q.category, q.prompt, q.passage, q.options, q.sort_order
  FROM public.cefr_questions q
  WHERE q.is_active
  ORDER BY q.sort_order
$$;

REVOKE ALL ON FUNCTION public.get_cefr_questions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cefr_questions() TO anon, authenticated, service_role;

-- 4. Per-question answers for post-submission review
CREATE TABLE public.cefr_assessment_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.cefr_assessments(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.cefr_questions(id) ON DELETE CASCADE,
  selected_answer integer,
  is_correct boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cefr_answers_assessment ON public.cefr_assessment_answers(assessment_id);

GRANT SELECT ON public.cefr_assessment_answers TO authenticated;
GRANT ALL ON public.cefr_assessment_answers TO service_role;

ALTER TABLE public.cefr_assessment_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own cefr answers" ON public.cefr_assessment_answers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cefr_assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()));

CREATE POLICY "Staff view cefr answers" ON public.cefr_assessment_answers
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role) OR private.has_role(auth.uid(), 'teacher'::public.app_role));

CREATE POLICY "Admins manage cefr answers" ON public.cefr_assessment_answers
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));