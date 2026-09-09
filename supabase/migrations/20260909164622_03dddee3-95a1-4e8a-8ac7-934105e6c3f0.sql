CREATE TABLE public.assessment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  description text,
  provider text,
  audience text NOT NULL DEFAULT 'all',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_links TO authenticated;
GRANT ALL ON public.assessment_links TO service_role;

ALTER TABLE public.assessment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view active assessment links"
ON public.assessment_links FOR SELECT TO authenticated
USING (is_active OR private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert assessment links"
ON public.assessment_links FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update assessment links"
ON public.assessment_links FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete assessment links"
ON public.assessment_links FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER assessment_links_touch_updated_at
BEFORE UPDATE ON public.assessment_links
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.assessment_links (title, url, description, provider, audience, sort_order)
VALUES ('Kids Placement Test', 'https://abridgeacademy.com/placement-test/', 'Free online placement test for young learners.', 'Abridge Academy', 'students', 1);