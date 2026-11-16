CREATE TABLE IF NOT EXISTS public.landing_content (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.landing_content TO anon, authenticated;
GRANT INSERT, UPDATE ON public.landing_content TO authenticated;
GRANT ALL ON public.landing_content TO service_role;
ALTER TABLE public.landing_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view landing content" ON public.landing_content;
CREATE POLICY "Anyone can view landing content" ON public.landing_content FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins insert landing content" ON public.landing_content;
CREATE POLICY "Admins insert landing content" ON public.landing_content FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins update landing content" ON public.landing_content;
CREATE POLICY "Admins update landing content" ON public.landing_content FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
INSERT INTO public.landing_content (id) VALUES (1) ON CONFLICT DO NOTHING;