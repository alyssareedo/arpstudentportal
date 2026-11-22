CREATE TABLE IF NOT EXISTS public.announcement_reads (
  announcement_id text NOT NULL,
  student_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, student_id)
);
GRANT SELECT, INSERT ON public.announcement_reads TO authenticated;
GRANT ALL ON public.announcement_reads TO service_role;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users record own reads" ON public.announcement_reads;
CREATE POLICY "Users record own reads" ON public.announcement_reads
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
DROP POLICY IF EXISTS "Users see own reads, staff see all" ON public.announcement_reads;
CREATE POLICY "Users see own reads, staff see all" ON public.announcement_reads
  FOR SELECT TO authenticated USING (
    student_id = auth.uid()
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'teacher'::public.app_role)
  );