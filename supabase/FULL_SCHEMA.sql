-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'student');
CREATE TYPE public.cefr_level AS ENUM ('A1','A2','B1','B2','C1','C2');
CREATE TYPE public.attendance_status AS ENUM ('present','absent','late','scheduled');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  level public.cefr_level DEFAULT 'A1',
  goals TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  lesson_time TIME NOT NULL DEFAULT '10:00',
  topic TEXT NOT NULL DEFAULT '',
  zoom_link TEXT,
  teams_link TEXT,
  homework TEXT,
  notes TEXT,
  attendance public.attendance_status NOT NULL DEFAULT 'scheduled',
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- scores
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  speaking INT NOT NULL DEFAULT 0 CHECK (speaking >= 0 AND speaking <= 100),
  grammar INT NOT NULL DEFAULT 0 CHECK (grammar >= 0 AND grammar <= 100),
  listening INT DEFAULT 0,
  writing INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, year, month)
);

-- homework
CREATE TABLE public.homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_at DATE NOT NULL DEFAULT CURRENT_DATE,
  due_at DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete profiles" ON public.profiles FOR DELETE USING (public.has_role(auth.uid(),'admin'));

-- user_roles policies
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- lessons policies
CREATE POLICY "Students view own lessons" ON public.lessons FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Admins view all lessons" ON public.lessons FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage lessons" ON public.lessons FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- scores policies
CREATE POLICY "Students view own scores" ON public.scores FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Admins view all scores" ON public.scores FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage scores" ON public.scores FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- homework policies
CREATE POLICY "Students view own homework" ON public.homework FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Admins view all homework" ON public.homework FOR SELECT USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Students update own homework completion" ON public.homework FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Admins manage homework" ON public.homework FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- handle_new_user trigger: create profile and assign role (first user = admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    v_role := 'admin';
  ELSE
    v_role := 'student';
  END IF;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger for profiles
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();ALTER FUNCTION public.touch_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

ALTER POLICY "Admins manage homework" ON public.homework
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins view all homework" ON public.homework
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins manage lessons" ON public.lessons
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins view all lessons" ON public.lessons
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins delete profiles" ON public.profiles
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins insert profiles" ON public.profiles
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins update all profiles" ON public.profiles
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins view all profiles" ON public.profiles
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins manage scores" ON public.scores
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins view all scores" ON public.scores
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins manage roles" ON public.user_roles
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

ALTER POLICY "Admins view all roles" ON public.user_roles
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatars are publicly readable"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users upload own avatar"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users update own avatar"
on storage.objects for update
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own avatar"
on storage.objects for delete
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS course_start_date DATE,
  ADD COLUMN IF NOT EXISTS lessons_purchased INTEGER DEFAULT 0;ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS teacher_id uuid;

CREATE TABLE IF NOT EXISTS public.availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_slots TO authenticated;
GRANT ALL ON public.availability_slots TO service_role;

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View active availability"
  ON public.availability_slots FOR SELECT TO authenticated
  USING (is_active = true OR private.has_role(auth.uid(), 'admin') OR teacher_id = auth.uid());

CREATE POLICY "Admins manage availability"
  ON public.availability_slots FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers manage own availability"
  ON public.availability_slots FOR ALL TO authenticated
  USING (teacher_id = auth.uid() AND private.has_role(auth.uid(), 'teacher'))
  WITH CHECK (teacher_id = auth.uid() AND private.has_role(auth.uid(), 'teacher'));

DO $$ BEGIN
  CREATE TYPE public.booking_status AS ENUM ('pending', 'approved', 'declined', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  teacher_id uuid,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status public.booking_status NOT NULL DEFAULT 'pending',
  student_message text,
  admin_notes text,
  lesson_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid
);

CREATE INDEX IF NOT EXISTS idx_bookings_student ON public.bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Students create own bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND status = 'pending');

CREATE POLICY "Students update own bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (student_id = auth.uid() AND status IN ('pending','approved'))
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Admins manage bookings"
  ON public.bookings FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers view bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'teacher'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lessons;
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
