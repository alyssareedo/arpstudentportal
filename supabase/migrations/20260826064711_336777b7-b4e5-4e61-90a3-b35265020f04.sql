ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS thumbnail_fit text NOT NULL DEFAULT 'cover';

ALTER TABLE public.materials
  DROP CONSTRAINT IF EXISTS materials_thumbnail_fit_check;

ALTER TABLE public.materials
  ADD CONSTRAINT materials_thumbnail_fit_check
  CHECK (thumbnail_fit IN ('cover','contain'));