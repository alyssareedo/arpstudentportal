DROP POLICY IF EXISTS "Users can insert their own materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Users can update their own materials" ON public.materials;
DROP POLICY IF EXISTS "Users can delete their own materials" ON public.materials;

CREATE POLICY "Admins and teachers can insert materials"
ON public.materials FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','teacher'))
);

CREATE POLICY "Owners (admin/teacher) can update materials"
ON public.materials FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','teacher'))
);

CREATE POLICY "Owners (admin/teacher) can delete materials"
ON public.materials FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','teacher'))
);