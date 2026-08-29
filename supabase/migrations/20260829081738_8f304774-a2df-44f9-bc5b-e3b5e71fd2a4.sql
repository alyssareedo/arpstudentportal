
-- 1) Bookings: prevent students from self-approving/completing bookings or editing booking details
CREATE OR REPLACE FUNCTION private.guard_booking_student_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Staff (admins and teachers with access to this student) are unrestricted
  IF private.has_role(auth.uid(), 'admin'::public.app_role)
     OR private.has_teacher_access(OLD.student_id) THEN
    RETURN NEW;
  END IF;

  -- Students may only transition a booking to 'cancelled'; no self-approval/completion
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.status <> 'cancelled'::public.booking_status THEN
    RAISE EXCEPTION 'Students can only cancel bookings, not change their status';
  END IF;

  -- Students may only edit their own message; all other fields are locked
  IF NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.teacher_id IS DISTINCT FROM OLD.teacher_id
     OR NEW.booking_date IS DISTINCT FROM OLD.booking_date
     OR NEW.start_time IS DISTINCT FROM OLD.start_time
     OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
     OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes
     OR NEW.lesson_id IS DISTINCT FROM OLD.lesson_id
     OR NEW.decided_at IS DISTINCT FROM OLD.decided_at
     OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
     OR NEW.google_event_id IS DISTINCT FROM OLD.google_event_id THEN
    RAISE EXCEPTION 'Students cannot modify booking details';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_booking_student_update ON public.bookings;
CREATE TRIGGER guard_booking_student_update
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION private.guard_booking_student_update();

-- 2) Homework: students may only toggle completion, not edit content
CREATE OR REPLACE FUNCTION private.guard_homework_student_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Staff (admins and teachers with access to this student) are unrestricted
  IF private.has_role(auth.uid(), 'admin'::public.app_role)
     OR private.has_teacher_access(OLD.student_id) THEN
    RETURN NEW;
  END IF;

  -- Students may only change completion fields; all other fields are locked
  IF NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.lesson_id IS DISTINCT FROM OLD.lesson_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at
     OR NEW.due_at IS DISTINCT FROM OLD.due_at THEN
    RAISE EXCEPTION 'Students can only mark homework as completed, not edit its content';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_homework_student_update ON public.homework;
CREATE TRIGGER guard_homework_student_update
BEFORE UPDATE ON public.homework
FOR EACH ROW EXECUTE FUNCTION private.guard_homework_student_update();
