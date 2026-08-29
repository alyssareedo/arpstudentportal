ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lessons_paid_off integer NOT NULL DEFAULT 0;