CREATE TABLE public.installment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  package_name text NOT NULL,
  total_amount numeric NOT NULL,
  installments_count integer NOT NULL,
  monthly_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'THB',
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  first_due_date date NOT NULL,
  lessons_added integer NOT NULL DEFAULT 0,
  payment_instructions text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.installment_plans TO authenticated;
GRANT ALL ON public.installment_plans TO service_role;
ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin view plans" ON public.installment_plans FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR private.has_role(auth.uid(),'admin'));

CREATE TABLE public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.installment_plans(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'unpaid',
  paid_at date,
  payment_reference text,
  admin_notes text,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, installment_number)
);
GRANT SELECT ON public.installments TO authenticated;
GRANT ALL ON public.installments TO service_role;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin view installments" ON public.installments FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR private.has_role(auth.uid(),'admin'));

CREATE TABLE public.installment_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id uuid NOT NULL REFERENCES public.installments(id) ON DELETE CASCADE,
  old_status text, new_status text, note text,
  changed_by uuid, changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.installment_audit TO authenticated;
GRANT ALL ON public.installment_audit TO service_role;
ALTER TABLE public.installment_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin view audit" ON public.installment_audit FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.create_installment_plan(
  _student uuid, _package text, _total numeric, _count integer,
  _purchase date, _first_due date, _lessons integer, _instructions text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan uuid; v_amt numeric; v_inv uuid; i int; v_due date;
BEGIN
  IF NOT private.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF _count < 1 OR _count > 36 OR _total <= 0 THEN RAISE EXCEPTION 'Invalid plan'; END IF;
  v_amt := round(_total / _count, 2);
  INSERT INTO installment_plans(student_id, package_name, total_amount, installments_count, monthly_amount,
    purchase_date, first_due_date, lessons_added, payment_instructions, created_by)
  VALUES (_student, _package, _total, _count, v_amt, _purchase, _first_due, coalesce(_lessons,0), _instructions, auth.uid())
  RETURNING id INTO v_plan;
  FOR i IN 1.._count LOOP
    v_due := (_first_due + make_interval(months => i-1))::date;
    INSERT INTO invoices(student_id, issue_date, due_date, package_name, lessons_count, subtotal, total, currency, status, notes, created_by)
    VALUES (_student, _purchase, v_due, _package || ' — Instalment ' || i || ' of ' || _count,
      CASE WHEN i=1 THEN _lessons ELSE NULL END, v_amt, v_amt, 'THB', 'pending',
      'Instalment ' || i || ' of ' || _count || '. Total package value ' || _total || ' THB.' || coalesce(E'\n' || _instructions,''), auth.uid())
    RETURNING id INTO v_inv;
    INSERT INTO installments(plan_id, student_id, installment_number, due_date, amount, invoice_id)
    VALUES (v_plan, _student, i, v_due, v_amt, v_inv);
  END LOOP;
  IF coalesce(_lessons,0) > 0 THEN
    UPDATE profiles SET lessons_purchased = coalesce(lessons_purchased,0) + _lessons WHERE id = _student;
  END IF;
  RETURN v_plan;
END $$;

CREATE OR REPLACE FUNCTION public.set_installment_status(
  _id uuid, _status text, _paid_at date, _reference text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old text; v_inv uuid;
BEGIN
  IF NOT private.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF _status NOT IN ('unpaid','paid') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT status, invoice_id INTO v_old, v_inv FROM installments WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  UPDATE installments SET status = _status,
    paid_at = CASE WHEN _status='paid' THEN coalesce(_paid_at, CURRENT_DATE) ELSE NULL END,
    payment_reference = _reference, admin_notes = _note
  WHERE id = _id;
  IF v_inv IS NOT NULL THEN
    UPDATE invoices SET status = CASE WHEN _status='paid' THEN 'paid' ELSE 'pending' END WHERE id = v_inv;
  END IF;
  INSERT INTO installment_audit(installment_id, old_status, new_status, note, changed_by)
  VALUES (_id, v_old, _status, _note, auth.uid());
END $$;

REVOKE EXECUTE ON FUNCTION public.create_installment_plan(uuid,text,numeric,integer,date,date,integer,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_installment_status(uuid,text,date,text,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_installment_plan(uuid,text,numeric,integer,date,date,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_installment_status(uuid,text,date,text,text) TO authenticated;