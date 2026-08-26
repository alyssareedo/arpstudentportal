CREATE OR REPLACE FUNCTION public.get_shared_schedule(_from date, _to date)
RETURNS TABLE(
  kind text,
  id uuid,
  teacher_name text,
  student_name text,
  weekday smallint,
  slot_date date,
  start_time time,
  end_time time,
  starts_at timestamptz,
  ends_at timestamptz,
  duration_minutes integer,
  status text,
  reason text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  SELECT 'booking'::text, bk.id, tp.full_name, sp.full_name, NULL::smallint, bk.booking_date,
         bk.start_time, NULL::time, NULL::timestamptz, NULL::timestamptz,
         bk.duration_minutes, bk.status::text, NULL::text
  FROM public.bookings bk
  LEFT JOIN public.profiles tp ON tp.id = bk.teacher_id
  LEFT JOIN public.profiles sp ON sp.id = bk.student_id
  WHERE auth.uid() IS NOT NULL
    AND bk.status IN ('approved','pending')
    AND bk.booking_date BETWEEN _from AND _to
$$;

REVOKE ALL ON FUNCTION public.get_shared_schedule(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_shared_schedule(date, date) TO authenticated;