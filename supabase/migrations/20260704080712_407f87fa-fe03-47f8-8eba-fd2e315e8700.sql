
-- Allow all authenticated users to read materials
DROP POLICY IF EXISTS "students read assigned materials" ON public.materials;
DROP POLICY IF EXISTS "teachers read materials" ON public.materials;
CREATE POLICY "authenticated read all materials" ON public.materials
  FOR SELECT TO authenticated USING (true);

-- Allow students/teachers to add their own materials
CREATE POLICY "users insert own materials" ON public.materials
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "users update own materials" ON public.materials
  FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "users delete own materials" ON public.materials
  FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Storage: let authenticated users upload to materials bucket
CREATE POLICY "authenticated upload materials files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'materials');
CREATE POLICY "owners delete own materials files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'materials' AND owner = auth.uid());
