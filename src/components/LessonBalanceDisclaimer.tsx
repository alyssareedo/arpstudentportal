import { Info } from "lucide-react";

/**
 * Small note shown wherever the lesson balance appears, so students and
 * admins know the number can drift when a lesson wasn't recorded in time.
 */
export function LessonBalanceDisclaimer() {
  return (
    <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-muted-foreground">
      <Info className="mt-0.5 h-3 w-3 shrink-0" />
      <span>
        Note: lessons are counted when they're recorded, so the classes remaining may not always be perfectly up to date.
      </span>
    </p>
  );
}
