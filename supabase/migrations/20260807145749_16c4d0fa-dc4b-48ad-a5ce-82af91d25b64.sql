ALTER TABLE public.course_offers
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

UPDATE public.course_offers SET category = 'promotion' WHERE is_promotion = true;