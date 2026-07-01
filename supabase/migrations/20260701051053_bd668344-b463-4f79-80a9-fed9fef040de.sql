
-- Phase 1: Admin calendar scheduler support

-- Blocked/holiday date ranges (per teacher, or global if teacher_id null)
CREATE TABLE public.availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_blocks TO authenticated;
GRANT ALL ON public.availability_blocks TO service_role;

ALTER TABLE public.availability_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all blocks"
  ON public.availability_blocks FOR ALL
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers view their blocks"
  ON public.availability_blocks FOR SELECT
  USING (
    private.has_role(auth.uid(), 'admin')
    OR teacher_id = auth.uid()
    OR teacher_id IS NULL
  );

-- Tighten availability_slots: admin-only writes
DROP POLICY IF EXISTS "Teachers manage own slots" ON public.availability_slots;
DROP POLICY IF EXISTS "Teachers can manage own slots" ON public.availability_slots;
DROP POLICY IF EXISTS "Admins manage all slots" ON public.availability_slots;
DROP POLICY IF EXISTS "Anyone authenticated can view active slots" ON public.availability_slots;

CREATE POLICY "Admins manage all slots"
  ON public.availability_slots FOR ALL
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view slots"
  ON public.availability_slots FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add fields for one-off (non-recurring) slots + google sync
ALTER TABLE public.availability_slots
  ADD COLUMN IF NOT EXISTS slot_date DATE,
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS google_event_id TEXT;
