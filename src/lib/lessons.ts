/** Human-friendly lesson balance wording: "No Lessons Left", "1 Lesson Left", "2 Lessons Left". */
export function formatLessonsLeft(remaining: number): string {
  const n = Math.max(0, Math.floor(remaining || 0));
  if (n === 0) return "No Lessons Left";
  return `${n} ${n === 1 ? "Lesson" : "Lessons"} Left`;
}

/** Remaining lessons for a student, counting only lessons taken since the balance reset date. */
export function lessonsRemaining(
  purchased: number | null | undefined,
  attendedSinceReset: number,
): number {
  return Math.max(0, (purchased ?? 0) - attendedSinceReset);
}

import { supabase } from "@/integrations/supabase/client";

/**
 * The start date of the course cycle a lesson belongs to: the most recent
 * package/renewal start on or before the lesson date. Numbering restarts at 1
 * for each cycle.
 */
export async function cycleStartFor(studentId: string, lessonDate: string): Promise<string | null> {
  const [{ data: prof }, { data: enrs }] = await Promise.all([
    supabase.from("profiles").select("lessons_reset_at, course_start_date").eq("id", studentId).maybeSingle(),
    (supabase.from as any)("course_enrollments").select("starts_at").eq("student_id", studentId),
  ]);
  const dates = [
    (prof as any)?.lessons_reset_at,
    (prof as any)?.course_start_date,
    ...(((enrs as any[]) ?? []).map((e) => e.starts_at)),
  ].filter(Boolean).filter((d: string) => d <= lessonDate) as string[];
  if (dates.length === 0) return null;
  return dates.sort().at(-1)!;
}

/** Next sequential lesson number within the student's current course cycle. */
export async function nextLessonNumber(studentId: string, lessonDate: string) {
  const cycle = await cycleStartFor(studentId, lessonDate);
  let q = supabase
    .from("lessons")
    .select("lesson_number")
    .eq("student_id", studentId)
    .order("lesson_number", { ascending: false })
    .limit(1);
  q = cycle ? q.eq("cycle_start", cycle) : q.is("cycle_start", null);
  const { data } = await q;
  const max = (data?.[0] as any)?.lesson_number ?? 0;
  return { cycle_start: cycle, lesson_number: max + 1 };
}
