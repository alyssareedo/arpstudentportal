-- Let signed-out visitors see active, non-archived prices on the home page.
GRANT SELECT ON public.course_offers TO anon;
DROP POLICY IF EXISTS "Visitors can view active offers" ON public.course_offers;
CREATE POLICY "Visitors can view active offers" ON public.course_offers
  FOR SELECT TO anon USING (is_active = true AND archived = false);
