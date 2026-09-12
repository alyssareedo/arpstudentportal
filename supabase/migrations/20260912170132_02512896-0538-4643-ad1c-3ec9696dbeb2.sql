CREATE OR REPLACE FUNCTION public.sync_curriculum_to_lesson()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_lesson_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.lesson_id IS NOT NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO public.lessons
      (student_id, lesson_date, lesson_time, topic, notes, attendance, completed)
    VALUES
      (NEW.student_id, NEW.item_date, COALESCE(NEW.start_time, '00:00'::time),
       COALESCE(NULLIF(NEW.title, ''), 'Lesson'), NEW.notes,
       CASE WHEN NEW.completed THEN 'present'::attendance_status ELSE 'scheduled'::attendance_status END,
       NEW.completed)
    RETURNING id INTO new_lesson_id;

    UPDATE public.curriculum_items SET lesson_id = new_lesson_id WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.lesson_id IS NOT NULL THEN
    UPDATE public.lessons l
       SET lesson_date = NEW.item_date,
           lesson_time = COALESCE(NEW.start_time, l.lesson_time),
           topic = COALESCE(NULLIF(NEW.title, ''), 'Lesson'),
           notes = NEW.notes,
           completed = NEW.completed,
           attendance = CASE WHEN NEW.completed THEN 'present'::attendance_status ELSE l.attendance END
     WHERE l.id = NEW.lesson_id
       AND (l.lesson_date IS DISTINCT FROM NEW.item_date
            OR l.topic IS DISTINCT FROM COALESCE(NULLIF(NEW.title, ''), 'Lesson')
            OR l.notes IS DISTINCT FROM NEW.notes
            OR l.completed IS DISTINCT FROM NEW.completed
            OR l.lesson_time IS DISTINCT FROM COALESCE(NEW.start_time, l.lesson_time));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_curriculum_to_lesson ON public.curriculum_items;
CREATE TRIGGER trg_sync_curriculum_to_lesson
AFTER INSERT OR UPDATE ON public.curriculum_items
FOR EACH ROW EXECUTE FUNCTION public.sync_curriculum_to_lesson();

REVOKE ALL ON FUNCTION public.sync_curriculum_to_lesson() FROM PUBLIC, anon, authenticated;