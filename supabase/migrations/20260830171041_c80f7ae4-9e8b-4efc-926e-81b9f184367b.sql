ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lessons_left_override integer;

CREATE TABLE IF NOT EXISTS public.curriculum_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_date date NOT NULL,
  start_time time,
  duration_minutes integer,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'lesson',
  unit text,
  topic text,
  activities text,
  materials text,
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  notes text,
  color text NOT NULL DEFAULT 'primary',
  completed boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculum_items TO authenticated;
GRANT ALL ON public.curriculum_items TO service_role;

ALTER TABLE public.curriculum_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read their own curriculum"
  ON public.curriculum_items FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'));

CREATE POLICY "Staff insert curriculum"
  ON public.curriculum_items FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'));

CREATE POLICY "Staff update curriculum"
  ON public.curriculum_items FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'))
  WITH CHECK (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'));

CREATE POLICY "Staff delete curriculum"
  ON public.curriculum_items FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'));

CREATE INDEX IF NOT EXISTS curriculum_items_student_date_idx ON public.curriculum_items(student_id, item_date);

CREATE TRIGGER curriculum_items_touch BEFORE UPDATE ON public.curriculum_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();