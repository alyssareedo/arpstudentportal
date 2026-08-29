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

/** Classes taken beyond the purchased package that have not been paid for yet. */
export function classesOwing(
  purchased: number | null | undefined,
  attendedSinceReset: number,
  paidOff: number | null | undefined,
): number {
  return Math.max(0, attendedSinceReset - (purchased ?? 0) - (paidOff ?? 0));
}

/** "No Classes Owing", "1 Class Owing", "3 Classes Owing". */
export function formatClassesOwing(owing: number): string {
  const n = Math.max(0, Math.floor(owing || 0));
  if (n === 0) return "No Classes Owing";
  return `${n} ${n === 1 ? "Class" : "Classes"} Owing`;
}

