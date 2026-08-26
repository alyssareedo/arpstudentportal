import { useEffect, useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, View, Event as RbcEvent } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addDays, addWeeks, setHours, setMinutes, startOfMonth, endOfMonth } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CalendarPlus, CalendarX, Trash2, Users, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

type EventKind = "slot" | "recurring" | "block" | "booking" | "google";
interface CalEvent extends RbcEvent {
  id: string;
  kind: EventKind;
  raw: any;
}

interface TeacherOpt { id: string; full_name: string }
interface StudentOpt { id: string; full_name: string }

export default function AdminCalendar() {
  const { user } = useAuth();
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<View>("week");
  const [teacherFilter, setTeacherFilter] = useState<string>("all");
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"slot" | "block" | "lesson">("slot");
  const [draft, setDraft] = useState<{ start: Date; end: Date }>({ start: new Date(), end: new Date() });
  const [teacherId, setTeacherId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [recurring, setRecurring] = useState(false);
  const [reason, setReason] = useState("");

  const [detailEvent, setDetailEvent] = useState<CalEvent | null>(null);

  // Google Calendar
  const [gcalOn, setGcalOn] = useState<boolean>(() => localStorage.getItem("arp_gcal_on") === "1");
  const [gcalId, setGcalId] = useState<string>(() => localStorage.getItem("arp_gcal_id") || "primary");
  const [gcalList, setGcalList] = useState<{ id: string; summary: string }[]>([]);
  const [gcalEvents, setGcalEvents] = useState<any[]>([]);
  const [gcalLoading, setGcalLoading] = useState(false);

  useEffect(() => { if (user) loadAll(); }, [user, date, teacherFilter]);

  useEffect(() => {
    localStorage.setItem("arp_gcal_on", gcalOn ? "1" : "0");
    localStorage.setItem("arp_gcal_id", gcalId);
    if (!gcalOn) { setGcalEvents([]); return; }
    loadGoogle();
  }, [gcalOn, gcalId, date, user]);

  const loadGoogle = async () => {
    if (!user) return;
    setGcalLoading(true);
    const timeMin = startOfMonth(addWeeks(date, -6)).toISOString();
    const timeMax = endOfMonth(addWeeks(date, 6)).toISOString();
    const [ev, cals] = await Promise.all([
      supabase.functions.invoke("google-calendar", { body: { action: "events", calendarId: gcalId, timeMin, timeMax } }),
      gcalList.length ? Promise.resolve(null) : supabase.functions.invoke("google-calendar", { body: { action: "calendars" } }),
    ]);
    if (ev.error || (ev.data as any)?.error) {
      toast.error((ev.data as any)?.error ?? "Could not load Google Calendar");
      setGcalEvents([]);
    } else {
      setGcalEvents((ev.data as any)?.events ?? []);
    }
    if (cals && !cals.error && (cals.data as any)?.calendars) setGcalList((cals.data as any).calendars);
    setGcalLoading(false);
  };


  const loadAll = async () => {
    setLoading(true);
    const monthStart = startOfMonth(addWeeks(date, -6));
    const monthEnd = endOfMonth(addWeeks(date, 6));

    const [{ data: roles }, slotsRes, blocksRes, bookingsRes] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").in("role", ["admin", "teacher", "student"]),
      supabase.from("availability_slots").select("*"),
      supabase.from("availability_blocks").select("*").gte("ends_at", monthStart.toISOString()).lte("starts_at", monthEnd.toISOString()),
      supabase.from("bookings").select("*").in("status", ["approved", "pending"]).gte("booking_date", monthStart.toISOString().slice(0, 10)).lte("booking_date", monthEnd.toISOString().slice(0, 10)),
    ]);

    const teacherIds = Array.from(new Set((roles ?? []).filter(r => r.role === "admin" || r.role === "teacher").map(r => r.user_id)));
    const studentIds = Array.from(new Set((roles ?? []).filter(r => r.role === "student").map(r => r.user_id)));
    const allIds = Array.from(new Set([...teacherIds, ...studentIds]));
    const { data: profs } = allIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", allIds)
      : { data: [] as any[] };
    setTeachers((profs ?? []).filter((p: any) => teacherIds.includes(p.id)));
    setStudents((profs ?? []).filter((p: any) => studentIds.includes(p.id)));

    const filteredSlots = (slotsRes.data ?? []).filter((s: any) => teacherFilter === "all" || s.teacher_id === teacherFilter);
    setSlots(filteredSlots);
    setBlocks((blocksRes.data ?? []).filter((b: any) => teacherFilter === "all" || !b.teacher_id || b.teacher_id === teacherFilter));
    setBookings((bookingsRes.data ?? []).filter((b: any) => teacherFilter === "all" || b.teacher_id === teacherFilter));
    setLoading(false);
  };

  // Expand recurring slots into calendar events for the visible window (±8 weeks)
  const events: CalEvent[] = useMemo(() => {
    const out: CalEvent[] = [];
    const weeksBack = 4, weeksFwd = 12;
    const anchor = startOfWeek(date);

    for (const s of slots) {
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);
      if (s.slot_date) {
        // one-off
        const d = new Date(s.slot_date + "T00:00:00");
        out.push({
          id: `slot-${s.id}`,
          kind: "slot",
          title: `Available — ${teachers.find(t => t.id === s.teacher_id)?.full_name ?? ""}`,
          start: setMinutes(setHours(d, sh), sm),
          end: setMinutes(setHours(d, eh), em),
          raw: s,
        });
      } else if (s.is_active) {
        for (let w = -weeksBack; w <= weeksFwd; w++) {
          const base = addWeeks(anchor, w);
          const d = addDays(base, s.weekday);
          out.push({
            id: `rec-${s.id}-${w}`,
            kind: "recurring",
            title: `Weekly — ${teachers.find(t => t.id === s.teacher_id)?.full_name ?? ""}`,
            start: setMinutes(setHours(d, sh), sm),
            end: setMinutes(setHours(d, eh), em),
            raw: s,
          });
        }
      }
    }
    for (const b of blocks) {
      out.push({
        id: `block-${b.id}`,
        kind: "block",
        title: `Blocked${b.reason ? ": " + b.reason : ""}`,
        start: new Date(b.starts_at),
        end: new Date(b.ends_at),
        raw: b,
      });
    }
    for (const bk of bookings) {
      const [sh, sm] = bk.start_time.split(":").map(Number);
      const d = new Date(bk.booking_date + "T00:00:00");
      const start = setMinutes(setHours(d, sh), sm);
      const end = new Date(start.getTime() + (bk.duration_minutes || 60) * 60000);
      out.push({
        id: `booking-${bk.id}`,
        kind: "booking",
        title: `${bk.status === "pending" ? "⏳ " : "📚 "}${students.find(s => s.id === bk.student_id)?.full_name ?? "Lesson"}`,
        start, end, raw: bk,
      });
    }
    for (const g of gcalEvents) {
      if (!g.start || !g.end) continue;
      out.push({
        id: `gcal-${g.id}`,
        kind: "google",
        title: `🗓 ${g.title}`,
        start: new Date(g.start),
        end: new Date(g.end),
        allDay: !!g.allDay,
        raw: g,
      });
    }
    return out;
  }, [slots, blocks, bookings, teachers, students, date, gcalEvents]);

  const eventStyle = (ev: CalEvent) => {
    const map: Record<EventKind, string> = {
      recurring: "hsl(210 90% 60%)",
      slot: "hsl(180 70% 45%)",
      block: "hsl(0 70% 55%)",
      booking: "hsl(30 95% 55%)",
      google: "hsl(265 70% 58%)",
    };
    return { style: { backgroundColor: map[ev.kind], borderRadius: 8, border: "none", padding: "2px 6px", fontSize: 12 } };
  };


  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setDraft({ start, end });
    setCreateMode("slot");
    setTeacherId(teacherFilter !== "all" ? teacherFilter : teachers[0]?.id ?? "");
    setStudentId("");
    setRecurring(false);
    setReason("");
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (createMode === "slot") {
      if (!teacherId) return toast.error("Pick a teacher");
      const payload: any = {
        teacher_id: teacherId,
        weekday: getDay(draft.start),
        start_time: format(draft.start, "HH:mm:ss"),
        end_time: format(draft.end, "HH:mm:ss"),
        is_active: true,
      };
      if (!recurring) payload.slot_date = format(draft.start, "yyyy-MM-dd");
      const { error } = await supabase.from("availability_slots").insert(payload);
      if (error) return toast.error(error.message);
      toast.success(recurring ? "Recurring slot added" : "One-off slot added");
    } else if (createMode === "block") {
      const { error } = await supabase.from("availability_blocks").insert({
        teacher_id: teacherId || null,
        starts_at: draft.start.toISOString(),
        ends_at: draft.end.toISOString(),
        reason,
        created_by: user!.id,
      });
      if (error) return toast.error(error.message);
      toast.success("Blocked");
    } else {
      if (!teacherId || !studentId) return toast.error("Pick teacher and student");
      const mins = Math.max(30, Math.round((draft.end.getTime() - draft.start.getTime()) / 60000));
      const { error } = await supabase.from("bookings").insert({
        teacher_id: teacherId,
        student_id: studentId,
        booking_date: format(draft.start, "yyyy-MM-dd"),
        start_time: format(draft.start, "HH:mm:ss"),
        duration_minutes: mins,
        status: "approved",
        decided_by: user!.id,
        decided_at: new Date().toISOString(),
      });
      if (error) return toast.error(error.message);
      toast.success("Lesson scheduled");
    }
    setCreateOpen(false);
    loadAll();
  };

  const deleteEvent = async (ev: CalEvent) => {
    if (!confirm("Delete this item?")) return;
    if (ev.kind === "slot" || ev.kind === "recurring") {
      await supabase.from("availability_slots").delete().eq("id", ev.raw.id);
    } else if (ev.kind === "block") {
      await supabase.from("availability_blocks").delete().eq("id", ev.raw.id);
    } else if (ev.kind === "booking") {
      await supabase.from("bookings").delete().eq("id", ev.raw.id);
    }
    toast.success("Deleted");
    setDetailEvent(null);
    loadAll();
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-elegant">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Scheduling calendar</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger className="w-[200px]"><Users className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teachers</SelectItem>
                {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => { setCreateMode("block"); setDraft({ start: new Date(), end: addDays(new Date(), 1) }); setTeacherId(""); setReason(""); setCreateOpen(true); }}>
              <CalendarX className="mr-2 h-4 w-4" /> Block dates
            </Button>
            <Button size="sm" onClick={() => { setCreateMode("lesson"); const s = new Date(); s.setMinutes(0, 0, 0); setDraft({ start: s, end: new Date(s.getTime() + 60 * 60000) }); setTeacherId(teachers[0]?.id ?? ""); setStudentId(""); setCreateOpen(true); }}>
              <CalendarPlus className="mr-2 h-4 w-4" /> Schedule lesson
            </Button>
          </div>
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
            <LegendDot color="hsl(210 90% 60%)" label="Recurring availability" />
            <LegendDot color="hsl(180 70% 45%)" label="One-off availability" />
            <LegendDot color="hsl(30 95% 55%)" label="Booked lesson" />
            <LegendDot color="hsl(0 70% 55%)" label="Blocked / holiday" />
          </div>
          <div style={{ height: 680 }} className="rounded-xl border border-border/60 bg-card">
            <Calendar
              localizer={localizer}
              events={events}
              date={date}
              view={view}
              onNavigate={setDate}
              onView={setView}
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={(e) => setDetailEvent(e as CalEvent)}
              eventPropGetter={eventStyle as any}
              views={["day", "week", "month"]}
              style={{ height: "100%", padding: 8 }}
              step={30}
              timeslots={2}
            />
          </div>
          {loading && <p className="mt-2 text-xs text-muted-foreground">Loading…</p>}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createMode === "slot" && "Add availability"}
              {createMode === "block" && "Block dates"}
              {createMode === "lesson" && "Schedule lesson"}
            </DialogTitle>
          </DialogHeader>
          <Tabs value={createMode} onValueChange={(v) => setCreateMode(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="slot">Availability</TabsTrigger>
              <TabsTrigger value="block">Block</TabsTrigger>
              <TabsTrigger value="lesson">Lesson</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start</Label>
                <Input type="datetime-local" value={format(draft.start, "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => setDraft(d => ({ ...d, start: new Date(e.target.value) }))} />
              </div>
              <div>
                <Label>End</Label>
                <Input type="datetime-local" value={format(draft.end, "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => setDraft(d => ({ ...d, end: new Date(e.target.value) }))} />
              </div>
            </div>
            {(createMode === "slot" || createMode === "lesson") && (
              <div>
                <Label>Teacher</Label>
                <Select value={teacherId} onValueChange={setTeacherId}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {createMode === "block" && (
              <>
                <div>
                  <Label>Teacher (optional — leave empty for all)</Label>
                  <Select value={teacherId || "all"} onValueChange={(v) => setTeacherId(v === "all" ? "" : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All teachers (holiday)</SelectItem>
                      {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Holiday, sick day, etc." />
                </div>
              </>
            )}
            {createMode === "slot" && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
                Repeat weekly on this day &amp; time
              </label>
            )}
            {createMode === "lesson" && (
              <div>
                <Label>Student</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!detailEvent} onOpenChange={(o) => !o && setDetailEvent(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detailEvent?.title as string}</DialogTitle></DialogHeader>
          {detailEvent && (
            <div className="space-y-2 text-sm">
              <p><b>When:</b> {format(detailEvent.start as Date, "PPP p")} – {format(detailEvent.end as Date, "p")}</p>
              <p><b>Type:</b> {detailEvent.kind}</p>
              {detailEvent.kind === "booking" && (
                <p><b>Status:</b> {detailEvent.raw.status}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => detailEvent && deleteEvent(detailEvent)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
            <Button variant="outline" onClick={() => setDetailEvent(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
