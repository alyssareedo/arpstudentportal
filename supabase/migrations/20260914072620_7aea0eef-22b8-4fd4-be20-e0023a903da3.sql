-- Protect admin-only booking fields from student edits
CREATE OR REPLACE FUNCTION private.guard_booking_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  -- Admins (and server-side role) may change anything
  IF private.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Everyone else (e.g. students editing their own booking) cannot change
  -- status or admin-only fields
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Only staff can change booking status';
  END IF;
  IF NEW.decided_at IS DISTINCT FROM OLD.decided_at
     OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
    RAISE EXCEPTION 'Only staff can edit booking decision fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_booking_admin_fields ON public.bookings;
CREATE TRIGGER guard_booking_admin_fields
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION private.guard_booking_admin_fields();