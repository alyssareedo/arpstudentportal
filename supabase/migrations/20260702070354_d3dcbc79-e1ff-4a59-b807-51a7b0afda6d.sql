
CREATE TABLE public.material_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'custom',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.material_categories TO authenticated;
GRANT ALL ON public.material_categories TO service_role;
ALTER TABLE public.material_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read categories" ON public.material_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage categories" ON public.material_categories FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL, description text, type text NOT NULL,
  storage_path text, external_url text,
  category_id uuid REFERENCES public.material_categories(id) ON DELETE SET NULL,
  cefr_level text, skill text, objectives text, lesson_plan text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER materials_touch BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.material_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  required boolean NOT NULL DEFAULT false,
  due_date date,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_assignments TO authenticated;
GRANT ALL ON public.material_assignments TO service_role;
ALTER TABLE public.material_assignments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.material_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  favorited boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (material_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_progress TO authenticated;
GRANT ALL ON public.material_progress TO service_role;
ALTER TABLE public.material_progress ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER matprog_touch BEFORE UPDATE ON public.material_progress FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Policies (after all tables exist)
CREATE POLICY "admin manage materials" ON public.materials FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "teachers read materials" ON public.materials FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'teacher'));
CREATE POLICY "students read assigned materials" ON public.materials FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.material_assignments a WHERE a.material_id = materials.id AND a.student_id = auth.uid()));

CREATE POLICY "admin manage assignments" ON public.material_assignments FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "student read own assignments" ON public.material_assignments FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "teacher read assigned students" ON public.material_assignments FOR SELECT TO authenticated
  USING (public.has_teacher_access(student_id));

CREATE POLICY "admin manage progress" ON public.material_progress FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "student manage own progress" ON public.material_progress FOR ALL TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "teacher read progress" ON public.material_progress FOR SELECT TO authenticated
  USING (public.has_teacher_access(student_id));

-- ROADMAP
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS planned_date date,
  ADD COLUMN IF NOT EXISTS is_planned boolean NOT NULL DEFAULT false;

-- INVOICES
CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1;
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n bigint;
BEGIN
  n := nextval('public.invoice_seq');
  RETURN 'ARP-' || to_char(now(),'YYYY') || '-' || lpad(n::text, 4, '0');
END; $$;

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE DEFAULT public.next_invoice_number(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_date date NOT NULL DEFAULT current_date,
  due_date date,
  package_name text,
  lessons_count integer,
  lesson_duration_min integer,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'THB',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  pdf_path text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage invoices" ON public.invoices FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "student read own invoices" ON public.invoices FOR SELECT TO authenticated
  USING (student_id = auth.uid());
CREATE POLICY "teacher read assigned invoices" ON public.invoices FOR SELECT TO authenticated
  USING (public.has_teacher_access(student_id));
CREATE TRIGGER invoices_touch BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  method text,
  proof_path text,
  uploaded_by uuid REFERENCES auth.users(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_payments TO authenticated;
GRANT ALL ON public.invoice_payments TO service_role;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage payments" ON public.invoice_payments FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "student read own payments" ON public.invoice_payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.student_id = auth.uid()));
CREATE POLICY "student add own payment proof" ON public.invoice_payments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.student_id = auth.uid()) AND uploaded_by = auth.uid());

-- NOTIFICATIONS
CREATE TABLE public.outbound_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'line',
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outbound_notifications TO authenticated;
GRANT ALL ON public.outbound_notifications TO service_role;
ALTER TABLE public.outbound_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage notifications" ON public.outbound_notifications FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
