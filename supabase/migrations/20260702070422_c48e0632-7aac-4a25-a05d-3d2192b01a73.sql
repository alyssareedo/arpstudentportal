
-- Materials bucket: admins full access; teachers read; students read (signed URLs work but we still gate for RLS listings)
CREATE POLICY "admin all materials files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='materials' AND private.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='materials' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "authenticated read materials files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='materials');

-- Invoices bucket: admin full; student read only files under their own uid folder; student write for payment proofs
CREATE POLICY "admin all invoice files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id='invoices' AND private.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='invoices' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "student read own invoice files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id='invoices' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "student upload own payment proof" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='invoices' AND (storage.foldername(name))[1] = auth.uid()::text);
