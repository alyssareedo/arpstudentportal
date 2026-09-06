DROP POLICY IF EXISTS "Teachers view their blocks" ON public.availability_blocks;
CREATE POLICY "Teachers view their blocks"
ON public.availability_blocks
FOR SELECT
TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  OR teacher_id = auth.uid()
  OR teacher_id IS NULL
);