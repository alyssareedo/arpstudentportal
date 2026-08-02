DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relkind IN ('r','p') AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.relname);
  END LOOP;
END $$;

-- Views
DO $$
DECLARE v record;
BEGIN
  FOR v IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relkind IN ('v','m') AND n.nspname='public'
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v.relname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', v.relname);
  END LOOP;
END $$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Public (logged-out) CEFR test submission
GRANT INSERT ON public.cefr_assessments TO anon;

-- TOEIC questions: hide correct answers from students
REVOKE SELECT ON public.toeic_questions FROM authenticated;
GRANT SELECT (id, section, difficulty, prompt, options, created_at) ON public.toeic_questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.toeic_questions TO authenticated;
