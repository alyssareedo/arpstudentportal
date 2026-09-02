CREATE TABLE public.curriculum_item_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL,
  student_id uuid NOT NULL,
  action text NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  old_values jsonb,
  new_values jsonb,
  changed_fields text[] NOT NULL DEFAULT '{}'
);

GRANT SELECT ON public.curriculum_item_audit TO authenticated;
GRANT ALL ON public.curriculum_item_audit TO service_role;

ALTER TABLE public.curriculum_item_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view curriculum audit"
ON public.curriculum_item_audit FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students can view their own curriculum audit"
ON public.curriculum_item_audit FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE INDEX curriculum_item_audit_item_idx ON public.curriculum_item_audit (item_id, changed_at DESC);

CREATE OR REPLACE FUNCTION public.log_curriculum_item_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_fields text[] := '{}';
  k text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    INSERT INTO public.curriculum_item_audit (item_id, student_id, action, changed_by, old_values, new_values, changed_fields)
    VALUES (NEW.id, NEW.student_id, 'created', auth.uid(), NULL, v_new, '{}');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    FOR k IN SELECT jsonb_object_keys(v_new) LOOP
      IF k NOT IN ('updated_at') AND v_new->k IS DISTINCT FROM v_old->k THEN
        v_fields := array_append(v_fields, k);
      END IF;
    END LOOP;
    IF array_length(v_fields, 1) IS NULL THEN
      RETURN NEW;
    END IF;
    INSERT INTO public.curriculum_item_audit (item_id, student_id, action, changed_by, old_values, new_values, changed_fields)
    VALUES (NEW.id, NEW.student_id, 'updated', auth.uid(), v_old, v_new, v_fields);
    RETURN NEW;
  ELSE
    v_old := to_jsonb(OLD);
    INSERT INTO public.curriculum_item_audit (item_id, student_id, action, changed_by, old_values, new_values, changed_fields)
    VALUES (OLD.id, OLD.student_id, 'deleted', auth.uid(), v_old, NULL, '{}');
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER curriculum_items_audit
AFTER INSERT OR UPDATE OR DELETE ON public.curriculum_items
FOR EACH ROW EXECUTE FUNCTION public.log_curriculum_item_change();