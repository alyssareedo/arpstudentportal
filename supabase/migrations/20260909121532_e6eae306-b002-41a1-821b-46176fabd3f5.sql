DROP POLICY IF EXISTS "Teachers view bookings" ON public.bookings;

DROP POLICY IF EXISTS "Teachers view student notes" ON public.student_notes;
CREATE POLICY "Teachers view student notes" ON public.student_notes
FOR SELECT TO authenticated
USING (private.has_teacher_access(student_id));

DROP POLICY IF EXISTS "Teachers view assessments" ON public.toeic_assessments;
CREATE POLICY "Teachers view assessments" ON public.toeic_assessments
FOR SELECT TO authenticated
USING (private.has_teacher_access(student_id));

DROP POLICY IF EXISTS "Teachers view answers" ON public.toeic_assessment_answers;
CREATE POLICY "Teachers view answers" ON public.toeic_assessment_answers
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.toeic_assessments a
  WHERE a.id = toeic_assessment_answers.assessment_id
    AND private.has_teacher_access(a.student_id)
));

DROP POLICY IF EXISTS "Teachers view assigned student bookings" ON public.bookings;
CREATE POLICY "Teachers view assigned student bookings" ON public.bookings
FOR SELECT TO authenticated
USING (private.has_teacher_access(student_id));