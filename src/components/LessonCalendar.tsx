import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type CalendarLesson = {
  id: string;
  lesson_date: string;
  lesson_time: string | null;
  topic: string | null;
  attendance: string;
  studentName?: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Parses a plain YYYY-MM-DD value as a local date (no UTC shift). */
function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dotClass(attendance: string) {
  switch (attendance) {
    case "present": return "bg-success";
    case "absent": return "bg-destructive";
    case "late": return "bg-warning";
    default: return "bg-primary";
  }
}

export function LessonCalendar({ lessons }: { lessons: CalendarLesson[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(toKey(today));

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarLesson[]>();
    for (const l of lessons) {
      if (!l.lesson_date) continue;
      const key = toKey(parseDate(l.lesson_date));
      const list = map.get(key) ?? [];
      list.push(l);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.lesson_time ?? "").localeCompare(b.lesson_time ?? ""));
    }
    return map;
  }, [lessons]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const start = new Date(first);
    start.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const selectedLessons = byDay.get(selected) ?? [];
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card className="border-border/60 shadow-elegant">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">{monthLabel}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => { const n = new Date(); setCursor(new Date(n.getFullYear(), n.getMonth(), 1)); setSelected(toKey(n)); }}>
                Today
              </Button>
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((d) => <div key={d} className="py-1 font-medium">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d) => {
              const key = toKey(d);
              const items = byDay.get(key) ?? [];
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = key === toKey(today);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={cn(
                    "flex min-h-16 flex-col items-start gap-1 rounded-lg border border-transparent p-1.5 text-left transition-colors hover:bg-secondary/60",
                    !inMonth && "opacity-40",
                    selected === key && "border-primary bg-secondary/60",
                    isToday && "ring-1 ring-primary/50",
                  )}
                >
                  <span className="text-xs font-medium">{d.getDate()}</span>
                  <span className="flex flex-wrap gap-0.5">
                    {items.slice(0, 4).map((l) => <span key={l.id} className={cn("h-1.5 w-1.5 rounded-full", dotClass(l.attendance))} />)}
                    {items.length > 4 && <span className="text-[10px] leading-none text-muted-foreground">+{items.length - 4}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-elegant">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-semibold">
            {parseDate(selected).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          {selectedLessons.length === 0 && <p className="text-sm text-muted-foreground">No lessons on this day.</p>}
          {selectedLessons.map((l) => (
            <div key={l.id} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {l.lesson_time?.slice(0, 5) ?? "—"}
                <Badge variant="secondary" className="ml-auto rounded-full capitalize">{l.attendance}</Badge>
              </div>
              <p className="mt-1 text-sm font-medium">{l.topic || "Untitled lesson"}</p>
              {l.studentName && <p className="text-xs text-muted-foreground">{l.studentName}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
