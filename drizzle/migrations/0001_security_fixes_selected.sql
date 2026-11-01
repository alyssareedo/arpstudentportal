CREATE OR REPLACE FUNCTION private.guard_profile_balance_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR private.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.lessons_left_override IS DISTINCT FROM OLD.lessons_left_override
     OR NEW.lessons_purchased IS DISTINCT FROM OLD.lessons_purchased
     OR NEW.lessons_paid_off IS DISTINCT FROM OLD.lessons_paid_off
     OR NEW.lessons_reset_at IS DISTINCT FROM OLD.lessons_reset_at THEN
    RAISE EXCEPTION 'Only admins can change lesson balance fields';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile_balance_fields ON public.profiles;
CREATE TRIGGER guard_profile_balance_fields BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.guard_profile_balance_fields();

CREATE OR REPLACE FUNCTION public.get_toeic_review(_assessment_id uuid)
 RETURNS TABLE(question_id uuid, section toeic_section, prompt text, options jsonb, selected_answer text, correct_answer text, is_correct boolean, explanation text)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.toeic_assessments a
    WHERE a.id = _assessment_id
      AND a.completed_at IS NOT NULL
      AND (
        a.student_id = auth.uid()
        OR private.has_role(auth.uid(), 'admin')
        OR (private.has_role(auth.uid(), 'teacher') AND private.has_teacher_access(a.student_id))
      )
  ) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT q.id, q.section, q.prompt, q.options,
         ans.selected_answer, q.correct_answer, ans.is_correct, q.explanation
  FROM public.toeic_assessment_answers ans
  JOIN public.toeic_questions q ON q.id = ans.question_id
  WHERE ans.assessment_id = _assessment_id
  ORDER BY ans.created_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_shared_schedule(_from date, _to date)
 RETURNS TABLE(kind text, id uuid, teacher_name text, student_name text, weekday smallint, slot_date date, start_time time without time zone, end_time time without time zone, starts_at timestamp with time zone, ends_at timestamp with time zone, duration_minutes integer, status text, reason text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT 'slot'::text, s.id, tp.full_name, NULL::text, s.weekday, s.slot_date,
         s.start_time, s.end_time, NULL::timestamptz, NULL::timestamptz,
         NULL::integer, NULL::text, NULL::text
  FROM public.availability_slots s
  LEFT JOIN public.profiles tp ON tp.id = s.teacher_id
  WHERE auth.uid() IS NOT NULL
    AND (s.slot_date IS NULL AND s.is_active OR s.slot_date BETWEEN _from AND _to)
  UNION ALL
  SELECT 'block'::text, b.id, tp.full_name, NULL::text, NULL::smallint, NULL::date,
         NULL::time, NULL::time, b.starts_at, b.ends_at,
         NULL::integer, NULL::text, b.reason
  FROM public.availability_blocks b
  LEFT JOIN public.profiles tp ON tp.id = b.teacher_id
  WHERE auth.uid() IS NOT NULL
    AND b.ends_at >= _from::timestamptz
    AND b.starts_at <= (_to + 1)::timestamptz
  UNION ALL
  SELECT 'booking'::text,
         CASE WHEN v.allowed THEN bk.id ELSE NULL::uuid END,
         tp.full_name,
         CASE WHEN v.allowed THEN sp.full_name ELSE NULL::text END,
         NULL::smallint, bk.booking_date,
         bk.start_time, NULL::time, NULL::timestamptz, NULL::timestamptz,
         bk.duration_minutes,
         CASE WHEN v.allowed THEN bk.status::text ELSE 'busy' END,
         NULL::text
  FROM public.bookings bk
  LEFT JOIN public.profiles tp ON tp.id = bk.teacher_id
  LEFT JOIN public.profiles sp ON sp.id = bk.student_id
  CROSS JOIN LATERAL (SELECT (
      bk.student_id = auth.uid()
      OR bk.teacher_id = auth.uid()
      OR private.has_role(auth.uid(), 'admin')
      OR private.has_teacher_access(bk.student_id)
    ) AS allowed) v
  WHERE auth.uid() IS NOT NULL
    AND bk.status IN ('approved','pending')
    AND bk.booking_date BETWEEN _from AND _to
$function$;

DROP POLICY IF EXISTS "read categories" ON public.material_categories;
CREATE POLICY "staff or assigned read categories" ON public.material_categories
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'teacher'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.materials m
      JOIN public.material_assignments ma ON ma.material_id = m.id
      WHERE m.category_id = material_categories.id AND ma.student_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Signed-in users can view curriculum options" ON public.curriculum_options;
CREATE POLICY "Staff or own curriculum view options" ON public.curriculum_options
  FOR SELECT TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::app_role)
    OR private.has_role(auth.uid(), 'teacher'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.curriculum_items ci
      WHERE ci.student_id = auth.uid()
        AND curriculum_options.name IN (ci.unit, ci.topic, ci.category, ci.title, ci.materials, ci.activities)
    )
  );

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Owners or staff list avatars" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'::text
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'teacher'::app_role)
    )
  );