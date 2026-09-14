import { useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, View, Event as RbcEvent } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addDays, addWeeks, setHours, setMinutes, startOfMonth, endOfMonth } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CalendarPlus } from "lucide-react";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

type Kind = "open" | "taken" | "closed";
interface CalEvent extends RbcEvent {
  id: string;
  kind: Kind;
  raw: any;
}

const COLORS: Record<Kind, string> = {
  open: "hsl(var(--success))",
  taken: "hsl(30 95% 55%)",
  closed: "hsl(0 70% 55%)",
};

export default function StudentCalendar() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("week");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CalEvent | null>(null);

  useEffect(() => { if (user) load(); }, [user, date]);

  const load = async () => {
    setLoading(true);
    const from = format(startOfMonth(addWeeks(date, -6)), "yyyy-MM-dd");
    const to = format(endOfMonth(addWeeks(date, 6)), "yyyy-MM-dd");
    const { data, error } = await supabase.rpc("get_shared_schedule", { _from: from, _to: to });
    if (!error) setRows(data ?? []);
    setLoading(false);
  };

  const events: CalEvent[] = useMemo(() => {
    const out: CalEvent[] = [];
    const anchor = startOfWeek(date);
    const weeksBack = 4, weeksFwd = 12;

    for (const r of rows) {
      if (r.kind === "slot") {
        const [sh, sm] = String(r.start_time).split(":").map(Number);
        const [eh, em] = String(r.end_time).split(":").map(Number);
        if (r.slot_date) {
          const d = new Date(r.slot_date + "T00:00:00");
          out.push({
            id: `slot-${r.id}`, kind: "open",
            title: `Open — ${r.teacher_name ?? "Teacher"}`,
            start: setMinutes(setHours(d, sh), sm),
            end: setMinutes(setHours(d, eh), em),
            raw: r,
          });
        } else {
          for (let w = -weeksBack; w <= weeksFwd; w++) {
            const d = addDays(addWeeks(anchor, w), r.weekday ?? 0);
            out.push({
              id: `slot-${r.id}-${w}`, kind: "open",
              title: `Open — ${r.teacher_name ?? "Teacher"}`,
              start: setMinutes(setHours(d, sh), sm),
              end: setMinutes(setHours(d, eh), em),
              raw: r,
            });
          }
        }
      } else if (r.kind === "booking") {
        const [sh, sm] = String(r.start_time).split(":").map(Number);
        const d = new Date(r.slot_date + "T00:00:00");
        const start = setMinutes(setHours(d, sh), sm);
        out.push({
          id: `bk-${r.id}`, kind: "taken",
          title: `${r.status === "pending" ? "⏳" : "📚"} ${r.student_name ?? "Booked"}`,
          start,
          end: new Date(start.getTime() + (r.duration_minutes || 60) * 60000),
          raw: r,
        });
      } else if (r.kind === "block") {
        out.push({
          id: `bl-${r.id}`, kind: "closed",
          title: `Closed${r.reason ? ": " + r.reason : ""}`,
          start: new Date(r.starts_at),
          end: new Date(r.ends_at),
          raw: r,
        });
      }
    }
    return out;
  }, [rows, date]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-elegant">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Teacher calendar — open &amp; booked times</CardTitle>
          <Button asChild size="sm"><Link to="/book"><CalendarPlus className="mr-2 h-4 w-4" /> Book a lesson</Link></Button>
        </CardHeader>
        <CardContent>
          <Tabs value={view} onValueChange={(v) => setView(v as View)} className="mb-3">
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap gap-3 pb-3 text-xs text-muted-foreground">
            <Legend color={COLORS.open} label="Available to learn" />
            <Legend color={COLORS.taken} label="Booked lesson" />
            <Legend color={COLORS.closed} label="Closed / holiday" />
          </div>
          <div style={{ height: 640 }} className="rounded-xl border border-border/60 bg-card">
            <Calendar
              localizer={localizer}
              events={events}
              date={date}
              view={view}
              onNavigate={setDate}
              onView={setView}
              onSelectEvent={(e) => setDetail(e as CalEvent)}
              eventPropGetter={((ev: CalEvent) => ({
                style: { backgroundColor: COLORS[ev.kind], borderRadius: 8, border: "none", padding: "2px 6px", fontSize: 12 },
              })) as any}
              views={["day", "week", "month"]}
              style={{ height: "100%", padding: 8 }}
              step={30}
              timeslots={2}
            />
          </div>
          {loading && <p className="mt-2 text-xs text-muted-foreground">Loading…</p>}
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detail?.title as string}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <p><b>When:</b> {format(detail.start as Date, "PPP p")} – {format(detail.end as Date, "p")}</p>
              {detail.kind === "open" && <p className="text-muted-foreground">This time is available — you can request it when booking.</p>}
              {detail.kind === "taken" && <p><b>Student:</b> {detail.raw.student_name ?? "—"} · <b>Status:</b> {detail.raw.status}</p>}
              {detail.kind === "closed" && <p className="text-muted-foreground">No lessons at this time.</p>}
              {detail.kind === "open" && (
                <Button asChild size="sm" className="mt-2"><Link to="/book">Book this time</Link></Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
