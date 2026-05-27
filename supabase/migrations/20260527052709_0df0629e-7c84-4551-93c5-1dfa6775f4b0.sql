
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
