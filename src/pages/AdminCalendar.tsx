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
import { CalendarCheck, CalendarPlus, CalendarX, Check, Trash2, Users, Copy, ClipboardPaste, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

type EventKind = "slot" | "recurring" | "block" | "booking" | "selected";

// Offset (minutes) of a timezone at a given instant
function tzOffset(date: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: any = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return (asUTC - date.getTime()) / 60000;
}

// Shift an instant so it renders as the wall-clock time of `tz`
function shiftToTz(date: Date, tz: string) {
  if (!tz) return date;
  const delta = tzOffset(date, tz) + date.getTimezoneOffset();
  return new Date(date.getTime() + delta * 60000);
}

const TZ_OPTIONS = [
  { value: "local", label: "My device time" },
  { value: "Asia/Bangkok", label: "Thailand (GMT+7)" },
  { value: "Africa/Johannesburg", label: "South Africa (GMT+2)" },
];
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
  const [selectingAvailability, setSelectingAvailability] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState<{ start: Date; end: Date }[]>([]);
  const [availabilityTeacherId, setAvailabilityTeacherId] = useState("");
  const [availabilityRecurring, setAvailabilityRecurring] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"slot" | "block" | "lesson">("slot");
  const [draft, setDraft] = useState<{ start: Date; end: Date }>({ start: new Date(), end: new Date() });
  const [teacherId, setTeacherId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [recurring, setRecurring] = useState(false);
  const [reason, setReason] = useState("");

  const [detailEvent, setDetailEvent] = useState<CalEvent | null>(null);
  // Inline edit of a booking's date/time/duration
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDuration, setEditDuration] = useState("60");
  const [applyAll, setApplyAll] = useState(false);
  const [saving, setSaving] = useState(false);

  // Copy / paste a recurring student's lesson
  const [clipboard, setClipboard] = useState<{ studentId: string; teacherId: string | null; duration: number; name: string } | null>(null);
  // How many weekly repeats each paste creates (1 = just the clicked day)
  const [repeatWeeks, setRepeatWeeks] = useState<string>("1");
  // Extra dates for bulk booking the same lesson
  const [extraDates, setExtraDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState("");

  const [tz, setTz] = useState<string>(() => localStorage.getItem("arp_cal_tz") || "local");
  const tzName = tz === "local" ? "" : tz;

  useEffect(() => { if (user) loadAll(); }, [user, date, teacherFilter]);

  useEffect(() => { localStorage.setItem("arp_cal_tz", tz); }, [tz]);




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
    for (const selected of selectedAvailability) {
      out.push({
        id: `selected-${selected.start.toISOString()}-${selected.end.toISOString()}`,
        kind: "selected",
        title: "Available",
        start: selected.start,
        end: selected.end,
        raw: selected,
      });
    }
    return out;
  }, [slots, blocks, bookings, teachers, students, date, tzName, selectedAvailability]);

  const eventStyle = (ev: CalEvent) => {
    const map: Record<EventKind, string> = {
      recurring: "hsl(var(--success))",
      slot: "hsl(var(--success))",
      selected: "hsl(var(--success))",
      block: "hsl(0 70% 55%)",
      booking: "hsl(30 95% 55%)",
    };

    return { style: { backgroundColor: map[ev.kind], color: "hsl(var(--success-foreground))", borderRadius: 8, border: ev.kind === "selected" ? "2px solid hsl(var(--success-foreground))" : "none", padding: "2px 6px", fontSize: 12 } };
  };


  const pasteLesson = async (start: Date) => {
    if (!clipboard) return;
    const weeks = Math.max(1, Number(repeatWeeks) || 1);
    const rows = Array.from({ length: weeks }, (_, i) => {
      const d = addWeeks(start, i);
      return {
        teacher_id: clipboard.teacherId,
        student_id: clipboard.studentId,
        booking_date: format(d, "yyyy-MM-dd"),
        start_time: format(d, "HH:mm:ss"),
        duration_minutes: clipboard.duration,
        status: "approved" as const,
        decided_by: user!.id,
        decided_at: new Date().toISOString(),
      };
    });
    const { error } = await supabase.from("bookings").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(
      weeks === 1
        ? `${clipboard.name} added on ${format(start, "EEE d MMM, HH:mm")}`
        : `${clipboard.name} added for ${weeks} weeks from ${format(start, "EEE d MMM, HH:mm")}`,
    );
    loadAll();
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (selectingAvailability) {
      const normalizedEnd = end.getTime() > start.getTime() ? end : new Date(start.getTime() + 30 * 60000);
      const key = `${start.toISOString()}_${normalizedEnd.toISOString()}`;
      setSelectedAvailability(current => {
        const exists = current.some(item => `${item.start.toISOString()}_${item.end.toISOString()}` === key);
        return exists ? current.filter(item => `${item.start.toISOString()}_${item.end.toISOString()}` !== key) : [...current, { start, end: normalizedEnd }];
      });
      return;
    }
    if (clipboard) { pasteLesson(start); return; }
    setDraft({ start, end: end.getTime() > start.getTime() ? end : new Date(start.getTime() + 60 * 60000) });
    setCreateMode("lesson");
    setTeacherId(teacherFilter !== "all" ? teacherFilter : teachers[0]?.id ?? "");
    setStudentId("");
    setRecurring(false);
    setReason("");
    setExtraDates([]);
    setCreateOpen(true);
  };

  const startAvailabilitySelection = () => {
    setSelectingAvailability(true);
    setSelectedAvailability([]);
    setAvailabilityTeacherId(teacherFilter !== "all" ? teacherFilter : teachers[0]?.id ?? "");
    setAvailabilityRecurring(false);
  };

  const cancelAvailabilitySelection = () => {
    setSelectingAvailability(false);
    setSelectedAvailability([]);
  };

  const saveSelectedAvailability = async () => {
    if (!availabilityTeacherId) return toast.error("Pick a teacher");
    if (selectedAvailability.length === 0) return toast.error("Select at least one time on the calendar");
    setSavingAvailability(true);
    const rows = selectedAvailability.map(({ start, end }) => ({
      teacher_id: availabilityTeacherId,
      weekday: getDay(start),
      start_time: format(start, "HH:mm:ss"),
      end_time: format(end, "HH:mm:ss"),
      is_active: true,
      ...(availabilityRecurring ? {} : { slot_date: format(start, "yyyy-MM-dd") }),
    }));
    const { error } = await supabase.from("availability_slots").insert(rows);
    setSavingAvailability(false);
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} available time${rows.length === 1 ? "" : "s"} saved`);
    setSelectingAvailability(false);
    setSelectedAvailability([]);
    loadAll();
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
      const weeks = Math.max(1, Number(repeatWeeks) || 1);
      const baseDates: Date[] = [draft.start];
      for (const ds of extraDates) {
        const d = new Date(`${ds}T00:00:00`);
        d.setHours(draft.start.getHours(), draft.start.getMinutes(), 0, 0);
        baseDates.push(d);
      }
      const rows = baseDates.flatMap((base) =>
        Array.from({ length: weeks }, (_, i) => {
          const d = addWeeks(base, i);
          return {
            teacher_id: teacherId,
            student_id: studentId,
            booking_date: format(d, "yyyy-MM-dd"),
            start_time: format(d, "HH:mm:ss"),
            duration_minutes: mins,
            status: "approved" as const,
            decided_by: user!.id,
            decided_at: new Date().toISOString(),
          };
        }),
      );
      const { error } = await supabase.from("bookings").insert(rows);
      if (error) return toast.error(error.message);
      toast.success(rows.length === 1 ? "Lesson scheduled" : `${rows.length} lessons scheduled`);
      setExtraDates([]);
    }

    setCreateOpen(false);
    loadAll();
  };

  const openDetail = (ev: CalEvent) => {
    setApplyAll(false);
    if (ev.kind === "booking") {
      setEditDate(ev.raw.booking_date);
      setEditTime(String(ev.raw.start_time).slice(0, 5));
      setEditDuration(String(ev.raw.duration_minutes || 60));
    }
    setDetailEvent(ev);
  };

  // Other approved/pending bookings of the same student (today onward)
  const siblingBookings = (bk: any) =>
    bookings.filter(b => b.student_id === bk.student_id && b.id !== bk.id);

  const saveBooking = async () => {
    if (!detailEvent) return;
    const bk = detailEvent.raw;
    setSaving(true);
    const patch = { booking_date: editDate, start_time: editTime + ":00", duration_minutes: Number(editDuration) || 60 };
    const { error } = await supabase.from("bookings").update(patch).eq("id", bk.id);
    if (error) { setSaving(false); return toast.error(error.message); }

    if (applyAll) {
      const ids = siblingBookings(bk).map(b => b.id);
      if (ids.length) {
        const { error: e2 } = await supabase
          .from("bookings")
          .update({ start_time: patch.start_time, duration_minutes: patch.duration_minutes })
          .in("id", ids);
        if (e2) { setSaving(false); return toast.error(e2.message); }
      }
      toast.success(`Updated this lesson and ${ids.length} other lesson${ids.length === 1 ? "" : "s"} for this student`);
    } else {
      toast.success("Lesson updated");
    }
    setSaving(false);
    setDetailEvent(null);
    loadAll();
  };

  const deleteEvent = async (ev: CalEvent) => {
    const alsoAll = ev.kind === "booking" && applyAll;
    if (!confirm(alsoAll ? "Delete every booking for this student?" : "Delete this item?")) return;
    if (ev.kind === "slot" || ev.kind === "recurring") {
      await supabase.from("availability_slots").delete().eq("id", ev.raw.id);
    } else if (ev.kind === "block") {
      await supabase.from("availability_blocks").delete().eq("id", ev.raw.id);
    } else if (ev.kind === "booking") {
      const ids = alsoAll ? [ev.raw.id, ...siblingBookings(ev.raw).map(b => b.id)] : [ev.raw.id];
      await supabase.from("bookings").delete().in("id", ids);
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
            <Button variant="outline" size="sm" onClick={startAvailabilitySelection} disabled={selectingAvailability}>
              <CalendarCheck className="mr-2 h-4 w-4" /> Select availability
            </Button>
            <Button size="sm" onClick={() => { setCreateMode("lesson"); const s = new Date(); s.setMinutes(0, 0, 0); setDraft({ start: s, end: new Date(s.getTime() + 60 * 60000) }); setTeacherId(teachers[0]?.id ?? ""); setStudentId(""); setCreateOpen(true); }}>
              <CalendarPlus className="mr-2 h-4 w-4" /> Schedule lesson
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectingAvailability && (
            <div className="mb-3 space-y-3 rounded-lg border border-success/40 bg-success/10 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <CalendarCheck className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Click or drag across multiple times. Selected times appear green.</span>
                <span className="rounded-full bg-success px-2.5 py-1 text-xs font-semibold text-success-foreground">
                  {selectedAvailability.length} selected
                </span>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[220px] flex-1">
                  <Label className="text-xs">Teacher</Label>
                  <Select value={availabilityTeacherId} onValueChange={setAvailabilityTeacherId}>
                    <SelectTrigger className="bg-card"><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <label className="flex h-10 items-center gap-2 text-sm">
                  <Switch checked={availabilityRecurring} onCheckedChange={setAvailabilityRecurring} />
                  Repeat every week
                </label>
                <Button variant="outline" onClick={cancelAvailabilitySelection}><X className="mr-2 h-4 w-4" /> Cancel</Button>
                <Button onClick={saveSelectedAvailability} disabled={savingAvailability || selectedAvailability.length === 0}>
                  <Check className="mr-2 h-4 w-4" /> {savingAvailability ? "Saving…" : "Save available times"}
                </Button>
              </div>
            </div>
          )}
          {clipboard && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
              <ClipboardPaste className="h-4 w-4 text-primary" />
              <span><b>{clipboard.name}</b> copied ({clipboard.duration} min) — click any empty time on the calendar to paste. Paste as many dates as you like.</span>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Repeat weekly</Label>
                <Select value={repeatWeeks} onValueChange={setRepeatWeeks}>
                  <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["1", "2", "4", "8", "12", "24"].map(n => (
                      <SelectItem key={n} value={n}>{n === "1" ? "Just this date" : `${n} weeks`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setClipboard(null)}>
                <X className="mr-1 h-4 w-4" /> Done
              </Button>
            </div>
          )}
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-muted/30 p-3">

            <div className="flex items-center gap-2">
              <Label className="text-sm">Show external times in</Label>
              <Select value={tz} onValueChange={setTz}>
                <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TZ_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={view} onValueChange={(v) => setView(v as View)} className="mb-3">
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap gap-3 pb-3 text-xs text-muted-foreground">
            <LegendDot color="hsl(var(--success))" label="Available to learn" />
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
              onSelectEvent={(e) => {
                const event = e as CalEvent;
                if (event.kind === "selected") {
                  setSelectedAvailability(current => current.filter(item => item !== event.raw));
                  return;
                }
                openDetail(event);
              }}
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
                <div className="mt-3">
                  <Label>Repeat weekly</Label>
                  <Select value={repeatWeeks} onValueChange={setRepeatWeeks}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["1", "2", "4", "8", "12", "24"].map(n => (
                        <SelectItem key={n} value={n}>{n === "1" ? "Just this date" : `Every week for ${n} weeks`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">Creates the same lesson on the same weekday and time.</p>
                </div>
                <div className="mt-3">
                  <Label>Also book on these dates</Label>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => {
                        if (!newDate || extraDates.includes(newDate)) return;
                        setExtraDates(d => [...d, newDate].sort());
                        setNewDate("");
                      }}>Add date</Button>
                  </div>
                  {extraDates.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {extraDates.map(d => (
                        <button key={d} type="button"
                          onClick={() => setExtraDates(x => x.filter(v => v !== d))}
                          className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
                          {d} <X className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">Same student and time on every date you add.</p>
                </div>
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
            <div className="space-y-3 text-sm">
              <p><b>When:</b> {format(detailEvent.start as Date, "PPP p")} – {format(detailEvent.end as Date, "p")}</p>
              <p><b>Type:</b> {detailEvent.kind}</p>
              {detailEvent.kind === "booking" && (
                <>
                  <p><b>Status:</b> {detailEvent.raw.status}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Date</Label>
                      <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Start time</Label>
                      <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Minutes</Label>
                      <Input type="number" min={15} step={15} value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
                    </div>
                  </div>
                  <label className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-2 text-xs">
                    <input type="checkbox" className="mt-0.5" checked={applyAll} onChange={(e) => setApplyAll(e.target.checked)} />
                    <span>
                      Apply to <b>all lessons for this student</b> ({siblingBookings(detailEvent.raw).length} other
                      {siblingBookings(detailEvent.raw).length === 1 ? " lesson" : " lessons"}). Saving changes their time and length;
                      deleting removes them all. Their dates stay as they are.
                    </span>
                  </label>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            {detailEvent?.kind === "booking" && (
              <Button
                variant="secondary"
                onClick={() => {
                  const bk = detailEvent.raw;
                  setClipboard({
                    studentId: bk.student_id,
                    teacherId: bk.teacher_id ?? null,
                    duration: bk.duration_minutes || 60,
                    name: students.find(s => s.id === bk.student_id)?.full_name ?? "Student",
                  });
                  setDetailEvent(null);
                  toast.success("Student copied — click empty times to paste, and set a weekly repeat if it is a regular lesson");
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copy student
              </Button>
            )}
            {detailEvent?.kind === "booking" && (
              <Button
                variant="secondary"
                onClick={() => {
                  const bk = detailEvent.raw;
                  setCreateMode("lesson");
                  setStudentId(bk.student_id);
                  setTeacherId(bk.teacher_id ?? teachers[0]?.id ?? "");
                  setDraft({ start: detailEvent.start as Date, end: detailEvent.end as Date });
                  setRepeatWeeks("1");
                  setExtraDates([]);
                  setNewDate("");
                  setDetailEvent(null);
                  setCreateOpen(true);
                }}
              >
                <ClipboardPaste className="mr-2 h-4 w-4" /> Copy to other dates
              </Button>
            )}
            {detailEvent?.kind === "booking" && (
              <Button onClick={saveBooking} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            )}
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
