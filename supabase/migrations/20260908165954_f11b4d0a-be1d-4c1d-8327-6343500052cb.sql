ALTER TABLE public.curriculum_items
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS curriculum_items_lesson_id_key
  ON public.curriculum_items(lesson_id) WHERE lesson_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_lesson_to_curriculum()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.curriculum_items ci
     SET student_id = NEW.student_id,
         item_date = NEW.lesson_date,
         start_time = NEW.lesson_time,
         title = COALESCE(NULLIF(NEW.topic, ''), 'Lesson'),
         completed = NEW.completed,
         notes = NEW.notes,
         updated_at = now()
   WHERE ci.lesson_id = NEW.id;

  IF NOT FOUND THEN
    INSERT INTO public.curriculum_items
      (student_id, lesson_id, item_date, start_time, duration_minutes, title, category, unit, topic, materials, notes, color, completed)
    VALUES
      (NEW.student_id, NEW.id, NEW.lesson_date, NEW.lesson_time, 60,
       COALESCE(NULLIF(NEW.topic, ''), 'Lesson'), 'lesson', 'Lessons',
       COALESCE(NULLIF(NEW.topic, ''), 'Lesson'), 'Lesson report', NEW.notes, 'primary', NEW.completed);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lessons_sync_curriculum ON public.lessons;
CREATE TRIGGER lessons_sync_curriculum
AFTER INSERT OR UPDATE ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.sync_lesson_to_curriculum();