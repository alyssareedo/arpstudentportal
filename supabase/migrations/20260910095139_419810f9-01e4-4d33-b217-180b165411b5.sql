CREATE TABLE public.video_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'Teaching Videos',
  thumbnail_url text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_links TO authenticated;
GRANT ALL ON public.video_links TO service_role;

ALTER TABLE public.video_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view active videos"
ON public.video_links FOR SELECT TO authenticated
USING (is_active OR private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'));

CREATE POLICY "Staff can insert videos"
ON public.video_links FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'));

CREATE POLICY "Staff can update videos"
ON public.video_links FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'));

CREATE POLICY "Staff can delete videos"
ON public.video_links FOR DELETE TO authenticated
USING (private.has_role(auth.uid(),'admin') OR private.has_role(auth.uid(),'teacher'));

CREATE TRIGGER video_links_touch BEFORE UPDATE ON public.video_links
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();