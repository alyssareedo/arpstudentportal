
-- 1) Move teacher notes off profiles into an admin-only table
CREATE TABLE IF NOT EXISTS public.student_notes (
  student_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_notes TO authenticated;
GRANT ALL ON public.student_notes TO service_role;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

INSERT INTO public.student_notes (student_id, notes)
SELECT id, COALESCE(notes,'')
FROM public.profiles
WHERE COALESCE(notes,'') <> ''
ON CONFLICT (student_id) DO NOTHING;

CREATE POLICY "Admins manage student notes"
  ON public.student_notes FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'))
  WITH CHECK (private.has_role(auth.uid(),'admin'));

CREATE POLICY "Teachers view student notes"
  ON public.student_notes FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'teacher'));

ALTER TABLE public.profiles DROP COLUMN IF EXISTS notes;

-- 2) Replace broad self-read policy with a sanitized view
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;

CREATE OR REPLACE VIEW public.my_profile AS
  SELECT id, full_name, email, phone, level, avatar_url, goals,
         lessons_purchased, joined_at, gender, course_start_date,
         created_at, updated_at
  FROM public.profiles
  WHERE id = auth.uid();
GRANT SELECT ON public.my_profile TO authenticated;

-- 3) Guard booking updates from students
CREATE OR REPLACE FUNCTION private.bookings_student_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF private.has_role(auth.uid(),'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
     OR NEW.lesson_id IS DISTINCT FROM OLD.lesson_id
     OR NEW.decided_at IS DISTINCT FROM OLD.decided_at
     OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
  THEN
    RAISE EXCEPTION 'Not allowed to modify protected booking fields';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status::text <> 'cancelled' THEN
    RAISE EXCEPTION 'Students may only cancel bookings';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bookings_student_guard ON public.bookings;
CREATE TRIGGER bookings_student_guard
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION private.bookings_student_guard();

-- 4) Hide TOEIC answer key
DROP POLICY IF EXISTS "Authenticated can read questions" ON public.toeic_questions;

CREATE OR REPLACE VIEW public.toeic_questions_public AS
  SELECT id, section, difficulty, prompt, options
  FROM public.toeic_questions;
GRANT SELECT ON public.toeic_questions_public TO authenticated;

-- 5) Restrictive policy on user_roles to block any student INSERT/UPDATE/DELETE
CREATE POLICY "Only admins can write roles"
  ON public.user_roles AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'))
  WITH CHECK (private.has_role(auth.uid(),'admin'));

-- 6) course_packages was using unqualified has_role -> resolves to public. Repoint to private.
DROP POLICY IF EXISTS "Admins manage packages" ON public.course_packages;
DROP POLICY IF EXISTS "Students view own packages" ON public.course_packages;

CREATE POLICY "Admins manage packages"
  ON public.course_packages FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'))
  WITH CHECK (private.has_role(auth.uid(),'admin'));

CREATE POLICY "Students view own packages"
  ON public.course_packages FOR SELECT TO authenticated
  USING (student_id = auth.uid()
         OR private.has_role(auth.uid(),'admin')
         OR private.has_role(auth.uid(),'teacher'));

-- 7) Remove duplicate public.has_role so callers can't bypass via search_path
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- 8) Remove sensitive tables from realtime publication (admins refresh on mount)
ALTER PUBLICATION supabase_realtime DROP TABLE public.lessons;
ALTER PUBLICATION supabase_realtime DROP TABLE public.bookings;
