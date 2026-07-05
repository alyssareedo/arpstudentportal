
-- Add tags to materials
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

-- Seed default material categories/folders if missing
INSERT INTO public.material_categories (name, kind)
SELECT n, 'folder' FROM (VALUES
  ('CEFR Materials'),('TOEIC Materials'),('TOEFL Materials'),('Business English'),
  ('Kids English'),('Grammar'),('Vocabulary'),('Speaking'),('Listening'),
  ('Reading'),('Writing'),('Homework')
) AS t(n)
WHERE NOT EXISTS (SELECT 1 FROM public.material_categories WHERE name = t.n);

-- News links table
CREATE TABLE IF NOT EXISTS public.news_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'General English News',
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_links TO authenticated;
GRANT ALL ON public.news_links TO service_role;

ALTER TABLE public.news_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read news"
  ON public.news_links FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins can insert news"
  ON public.news_links FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "admins can update news"
  ON public.news_links FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "admins can delete news"
  ON public.news_links FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE TRIGGER news_links_updated_at BEFORE UPDATE ON public.news_links
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed defaults
INSERT INTO public.news_links (title, url, description, category, sort_order) VALUES
  ('BBC Learning English','https://www.bbc.co.uk/learningenglish','Free English lessons, news reports and videos','General English News',1),
  ('VOA Learning English','https://learningenglish.voanews.com','News and features in simplified English','General English News',2),
  ('Breaking News English','https://breakingnewsenglish.com','Graded news lessons for all levels','General English News',3),
  ('BBC News','https://www.bbc.com/news','World news from the BBC','General English News',4),
  ('Reuters','https://www.reuters.com','International news and business updates','Business English',5),
  ('National Geographic Education','https://education.nationalgeographic.org','Educational resources on science and culture','General English News',6)
ON CONFLICT DO NOTHING;
