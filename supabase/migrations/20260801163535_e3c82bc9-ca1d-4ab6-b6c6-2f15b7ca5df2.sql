CREATE TABLE public.course_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  period_label text,
  description text,
  lessons_count integer,
  lesson_minutes integer,
  price numeric NOT NULL DEFAULT 0,
  original_price numeric,
  currency text NOT NULL DEFAULT 'THB',
  promo_tag text,
  is_promotion boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  valid_from date,
  valid_until date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_offers TO authenticated;
GRANT ALL ON public.course_offers TO service_role;

ALTER TABLE public.course_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active offers"
  ON public.course_offers FOR SELECT TO authenticated
  USING (is_active OR private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert offers"
  ON public.course_offers FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update offers"
  ON public.course_offers FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete offers"
  ON public.course_offers FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'));

CREATE TRIGGER course_offers_touch BEFORE UPDATE ON public.course_offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();