CREATE TABLE public.curriculum_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('unit','topic')),
  name text NOT NULL,
  parent_unit text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, name, parent_unit)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.curriculum_options TO authenticated;
GRANT ALL ON public.curriculum_options TO service_role;

ALTER TABLE public.curriculum_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view curriculum options"
  ON public.curriculum_options FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can insert curriculum options"
  ON public.curriculum_options FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'));

CREATE POLICY "Staff can update curriculum options"
  ON public.curriculum_options FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'))
  WITH CHECK (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'));

CREATE POLICY "Admins can delete curriculum options"
  ON public.curriculum_options FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(),'admin'));

CREATE TRIGGER curriculum_options_touch BEFORE UPDATE ON public.curriculum_options
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();