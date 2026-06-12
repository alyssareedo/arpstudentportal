
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lessons_reset_at date,
  ADD COLUMN IF NOT EXISTS placeholder_email boolean NOT NULL DEFAULT false;
