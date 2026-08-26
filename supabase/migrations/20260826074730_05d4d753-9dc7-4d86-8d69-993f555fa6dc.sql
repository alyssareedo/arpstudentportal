ALTER TABLE public.material_categories
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_fit text NOT NULL DEFAULT 'cover';