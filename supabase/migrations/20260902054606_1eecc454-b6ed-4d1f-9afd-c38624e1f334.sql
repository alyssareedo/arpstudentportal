ALTER TABLE public.curriculum_items REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'curriculum_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.curriculum_items;
  END IF;
END $$;