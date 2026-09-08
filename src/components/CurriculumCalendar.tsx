import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO,
  startOfMonth, startOfWeek, eachDayOfInterval, addDays, setMonth, setYear,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, Save, BookOpen, CalendarDays, LayoutList, History, Download } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface CurriculumItem {
  id: string;
  student_id: string;
  item_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  title: string;
  category: string;
  unit: string | null;
  topic: string | null;
  activities: string | null;
  materials: string | null;
  notes: string | null;
  color: string;
  completed: boolean;
}

/** Colour options mapped to design tokens (no hardcoded colour utilities). */
export const CURRICULUM_COLORS: { value: string; label: string; className: string; swatch: string }[] = [
  { value: "primary", label: "Core lesson", className: "bg-primary/15 text-primary border-primary/30", swatch: "bg-primary" },
  { value: "accent", label: "Speaking", className: "bg-accent/15 text-accent border-accent/30", swatch: "bg-accent" },
  { value: "success", label: "Review", className: "bg-success/15 text-success border-success/30", swatch: "bg-success" },
  { value: "warning", label: "Homework", className: "bg-warning/15 text-warning-foreground border-warning/40", swatch: "bg-warning" },
  { value: "destructive", label: "Assessment", className: "bg-destructive/10 text-destructive border-destructive/30", swatch: "bg-destructive" },
  { value: "rose", label: "Rose", className: "bg-[hsl(var(--cur-rose)/0.15)] text-[hsl(var(--cur-rose))] border-[hsl(var(--cur-rose)/0.35)]", swatch: "bg-[hsl(var(--cur-rose))]" },
  { value: "amber", label: "Amber", className: "bg-[hsl(var(--cur-amber)/0.15)] text-[hsl(var(--cur-amber))] border-[hsl(var(--cur-amber)/0.35)]", swatch: "bg-[hsl(var(--cur-amber))]" },
  { value: "emerald", label: "Emerald", className: "bg-[hsl(var(--cur-emerald)/0.15)] text-[hsl(var(--cur-emerald))] border-[hsl(var(--cur-emerald)/0.35)]", swatch: "bg-[hsl(var(--cur-emerald))]" },
  { value: "sky", label: "Sky", className: "bg-[hsl(var(--cur-sky)/0.15)] text-[hsl(var(--cur-sky))] border-[hsl(var(--cur-sky)/0.35)]", swatch: "bg-[hsl(var(--cur-sky))]" },
  { value: "violet", label: "Violet", className: "bg-[hsl(var(--cur-violet)/0.15)] text-[hsl(var(--cur-violet))] border-[hsl(var(--cur-violet)/0.35)]", swatch: "bg-[hsl(var(--cur-violet))]" },
  { value: "teal", label: "Teal", className: "bg-[hsl(var(--cur-teal)/0.15)] text-[hsl(var(--cur-teal))] border-[hsl(var(--cur-teal)/0.35)]", swatch: "bg-[hsl(var(--cur-teal))]" },
  { value: "indigo", label: "Indigo", className: "bg-[hsl(var(--cur-indigo)/0.15)] text-[hsl(var(--cur-indigo))] border-[hsl(var(--cur-indigo)/0.35)]", swatch: "bg-[hsl(var(--cur-indigo))]" },
  { value: "muted", label: "Other", className: "bg-muted text-muted-foreground border-border", swatch: "bg-[hsl(var(--cur-slate))]" },
];

const colorClass = (c: string) =>
  CURRICULUM_COLORS.find((x) => x.value === c)?.className ?? CURRICULUM_COLORS[0].className;

/** Clickable colour swatches so a colour can be picked without a dropdown. */
export function ColorSwatchPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CURRICULUM_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.label}
          aria-label={c.label}
          onClick={() => onChange(c.value)}
          className={`h-7 w-7 rounded-full border-2 transition-transform ${c.swatch} ${
            value === c.value ? "scale-110 border-foreground" : "border-transparent hover:scale-105"
          }`}
        />
      ))}
    </div>
  );
}

/** Field that offers existing options as clickable chips and still allows free typing. */
export function OptionPicker({
  label, value, options, onChange, invalid, placeholder,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  invalid?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder ?? `Choose below or type your own ${label.toLowerCase()}`}
        aria-invalid={!!invalid}
        className={invalid ? "border-destructive" : ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange(o)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                value === o ? "border-primary bg-primary/10 text-primary" : "border-border/60 hover:bg-muted"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Solid banner styles for unit headers in the curriculum map view. */
const UNIT_BANNERS = [
  "bg-primary text-primary-foreground",
  "bg-accent text-accent-foreground",
  "bg-success text-success-foreground",
  "bg-warning text-warning-foreground",
  "bg-destructive text-destructive-foreground",
];
const UNIT_BADGES = [
  "bg-primary/15 text-primary border-primary/30",
  "bg-accent/15 text-accent border-accent/30",
  "bg-success/15 text-success border-success/30",
  "bg-warning/15 text-warning-foreground border-warning/40",
  "bg-destructive/10 text-destructive border-destructive/30",
];

const CATEGORIES = ["lesson", "unit", "topic", "activity", "material", "assessment", "review"];

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const YEARS = Array.from({ length: 13 }, (_, i) => new Date().getFullYear() - 4 + i);
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 – 22:00

const emptyForm = (date: string): Omit<CurriculumItem, "id" | "student_id"> => ({
  item_date: date,
  start_time: "",
  duration_minutes: 60,
  title: "",
  category: "lesson",
  unit: "",
  topic: "",
  activities: "",
  materials: "",
  notes: "",
  color: "primary",
  completed: false,
});

interface AuditEntry {
  id: string;
  action: string;
  changed_at: string;
  changed_by: string | null;
  changed_fields: string[];
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  author?: string;
}

/** Fields that must be filled before a curriculum item can be saved. */
const REQUIRED_FIELDS: { key: "title" | "unit" | "topic" | "materials"; label: string }[] = [
  { key: "title", label: "Title is required" },
  { key: "unit", label: "Unit is required" },
  { key: "topic", label: "Topic is required" },
  { key: "materials", label: "Materials / textbook is required" },
];

const icsEscape = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

const toIcsStamp = (date: string, time: string | null, addMinutes = 0) => {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "09:00").split(":").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0));
  dt.setUTCMinutes(dt.getUTCMinutes() + addMinutes);
  return dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
};


export function CurriculumCalendar({ studentId, canEdit }: { studentId: string; canEdit: boolean }) {
  const [cursor, setCursor] = useState(new Date());
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Date>(new Date());
  const [editing, setEditing] = useState<CurriculumItem | null>(null);
  const [form, setForm] = useState(emptyForm(format(new Date(), "yyyy-MM-dd")));
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"map" | "calendar" | "week">("map");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [unitOptions, setUnitOptions] = useState<string[]>([]);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("curriculum_items")
      .select("*")
      .eq("student_id", studentId)
      .order("item_date")
      .order("start_time", { nullsFirst: true });
    if (view === "calendar") {
      q = q
        .gte("item_date", format(startOfWeek(startOfMonth(cursor)), "yyyy-MM-dd"))
        .lte("item_date", format(endOfWeek(endOfMonth(cursor)), "yyyy-MM-dd"));
    } else if (view === "week") {
      q = q
        .gte("item_date", format(startOfWeek(cursor), "yyyy-MM-dd"))
        .lte("item_date", format(endOfWeek(cursor), "yyyy-MM-dd"));
    }
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setItems((data as unknown as CurriculumItem[]) ?? []);
    setLoading(false);
  }, [studentId, cursor, view]);

  useEffect(() => { load(); }, [load]);

  // Saved unit/topic options power the clickable chips in the edit dialog.
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("curriculum_options")
        .select("kind, name, is_active")
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      const rows = (data as { kind: string; name: string }[]) ?? [];
      setUnitOptions(rows.filter((r) => r.kind === "unit").map((r) => r.name));
      setTopicOptions(rows.filter((r) => r.kind === "topic").map((r) => r.name));
    })();
  }, []);

  // Live feed: any curriculum change for this student refreshes map/calendar views.
  useEffect(() => {
    if (!studentId) return;
    const channel = supabase
      .channel(`curriculum-${studentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curriculum_items", filter: `student_id=eq.${studentId}` },
        () => { load(); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [studentId, load]);

  const days = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(startOfMonth(cursor)), end: endOfWeek(endOfMonth(cursor)) }),
    [cursor],
  );

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(cursor), end: endOfWeek(cursor) }),
    [cursor],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, CurriculumItem[]>();
    for (const it of items) {
      const list = map.get(it.item_date) ?? [];
      list.push(it);
      map.set(it.item_date, list);
    }
    return map;
  }, [items]);

  /** Map view: items grouped into units, like a textbook contents page. */
  const unitGroups = useMemo(() => {
    const groups = new Map<string, CurriculumItem[]>();
    for (const it of items) {
      const k = it.unit?.trim() || "General";
      const list = groups.get(k) ?? [];
      list.push(it);
      groups.set(k, list);
    }
    return [...groups.entries()];
  }, [items]);

  const dayItems = byDay.get(format(selected, "yyyy-MM-dd")) ?? [];

  const openNew = (d: Date) => {
    setEditing(null);
    setErrors({});
    setAudit([]);
    setAuditOpen(false);
    setForm(emptyForm(format(d, "yyyy-MM-dd")));
    setOpen(true);
  };

  /** Load the change history (who / when / previous values) for one item. */
  const loadAudit = useCallback(async (itemId: string) => {
    setAuditLoading(true);
    const { data, error } = await supabase
      .from("curriculum_item_audit")
      .select("id, action, changed_at, changed_by, changed_fields, old_values, new_values")
      .eq("item_id", itemId)
      .order("changed_at", { ascending: false })
      .limit(50);
    if (error) {
      setAuditLoading(false);
      return toast.error(error.message);
    }
    const rows = (data as unknown as AuditEntry[]) ?? [];
    const ids = [...new Set(rows.map((r) => r.changed_by).filter(Boolean))] as string[];
    let names = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      names = new Map((profs ?? []).map((p) => [p.id as string, p.full_name as string]));
    }
    setAudit(rows.map((r) => ({ ...r, author: (r.changed_by && names.get(r.changed_by)) || "System" })));
    setAuditLoading(false);
  }, []);

  /** Download all curriculum lessons as an .ics file for any calendar app. */
  const exportIcs = () => {
    if (!items.length) return toast.error("No curriculum items to export");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ARP Speak English With Me//Curriculum//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Curriculum plan",
    ];
    for (const it of items) {
      const desc = [
        it.topic ? `Topic: ${it.topic}` : "",
        it.activities ? `Activities: ${it.activities}` : "",
        it.materials ? `Materials: ${it.materials}` : "",
        it.notes ? `Notes: ${it.notes}` : "",
      ].filter(Boolean).join("\n");
      lines.push(
        "BEGIN:VEVENT",
        `UID:${it.id}@arpspeak`,
        `DTSTAMP:${toIcsStamp(format(new Date(), "yyyy-MM-dd"), format(new Date(), "HH:mm"))}`,
        `DTSTART:${toIcsStamp(it.item_date, it.start_time)}`,
        `DTEND:${toIcsStamp(it.item_date, it.start_time, it.duration_minutes ?? 60)}`,
        `SUMMARY:${icsEscape(it.unit ? `${it.unit} — ${it.title}` : it.title)}`,
        desc ? `DESCRIPTION:${icsEscape(desc)}` : "DESCRIPTION:",
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "curriculum.ics";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Curriculum calendar (.ics) downloaded");
  };


  const openEdit = (it: CurriculumItem) => {
    setEditing(it);
    setForm({
      item_date: it.item_date,
      start_time: it.start_time ?? "",
      duration_minutes: it.duration_minutes ?? 60,
      title: it.title,
      category: it.category,
      unit: it.unit ?? "",
      topic: it.topic ?? "",
      activities: it.activities ?? "",
      materials: it.materials ?? "",
      notes: it.notes ?? "",
      color: it.color,
      completed: it.completed,
    });
    setErrors({});
    setAuditOpen(false);
    setAudit([]);
    setOpen(true);
    loadAudit(it.id);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    for (const f of REQUIRED_FIELDS) {
      if (!String(form[f.key] ?? "").trim()) next[f.key] = f.label;
    }
    if (!form.item_date) next.item_date = "Date is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    if (!validate()) return toast.error("Fill in the highlighted fields before saving");
    setBusy(true);
    const payload = {
      student_id: studentId,
      item_date: form.item_date,
      start_time: form.start_time || null,
      duration_minutes: Number(form.duration_minutes) || null,
      title: form.title.trim(),
      category: form.category,
      unit: form.unit || null,
      topic: form.topic || null,
      activities: form.activities || null,
      materials: form.materials || null,
      notes: form.notes || null,
      color: form.color,
      completed: form.completed,
    };
    const { error } = editing
      ? await supabase.from("curriculum_items").update(payload as never).eq("id", editing.id)
      : await supabase.from("curriculum_items").insert(payload as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Curriculum item updated" : "Curriculum item added");
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!editing) return;
    if (!confirm("Delete this curriculum item?")) return;
    setBusy(true);
    const { error } = await supabase.from("curriculum_items").delete().eq("id", editing.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Curriculum item deleted");
    setOpen(false);
    load();
  };

  const move = async (it: CurriculumItem, newDate: string) => {
    const { error } = await supabase.from("curriculum_items").update({ item_date: newDate } as never).eq("id", it.id);
    if (error) return toast.error(error.message);
    toast.success(`Moved to ${newDate}`);
    load();
  };

  return (
    <Card className="border-border/60 shadow-elegant">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-primary" /> Personalized curriculum
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-border/60 p-0.5">
            <Button size="sm" variant={view === "map" ? "default" : "ghost"} className="h-7 rounded-full px-3" onClick={() => setView("map")}>
              <LayoutList className="mr-1 h-3.5 w-3.5" /> Map
            </Button>
            <Button size="sm" variant={view === "week" ? "default" : "ghost"} className="h-7 rounded-full px-3" onClick={() => setView("week")}>
              <CalendarDays className="mr-1 h-3.5 w-3.5" /> Timetable
            </Button>
            <Button size="sm" variant={view === "calendar" ? "default" : "ghost"} className="h-7 rounded-full px-3" onClick={() => setView("calendar")}>
              <CalendarDays className="mr-1 h-3.5 w-3.5" /> Month
            </Button>
          </div>
          <Button size="sm" variant="outline" className="h-7 rounded-full px-3" onClick={exportIcs}>
            <Download className="mr-1 h-3.5 w-3.5" /> Export .ics
          </Button>
          {view !== "map" && (<>
          <Button variant="outline" size="icon" aria-label="Previous"
            onClick={() => setCursor(view === "week" ? addDays(cursor, -7) : addMonths(cursor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select value={String(cursor.getMonth())} onValueChange={(v) => setCursor(setMonth(cursor, Number(v)))}>
            <SelectTrigger className="h-9 w-[8.5rem]"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(cursor.getFullYear())} onValueChange={(v) => setCursor(setYear(cursor, Number(v)))}>
            <SelectTrigger className="h-9 w-[6rem]"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" aria-label="Next"
            onClick={() => setCursor(view === "week" ? addDays(cursor, 7) : addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-9 rounded-full px-3" onClick={() => { setCursor(new Date()); setSelected(new Date()); }}>
            Today
          </Button>
          </>)}
          {canEdit && (
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => openNew(selected)}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs">
          {CURRICULUM_COLORS.map((c) => (
            <span key={c.value} className={`rounded-full border px-2 py-0.5 ${c.className}`}>{c.label}</span>
          ))}
        </div>

        {view === "week" && (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <div className="min-w-[52rem]">
              <div className="grid grid-cols-[4.5rem_repeat(7,1fr)] border-b border-border/60 bg-muted/50">
                <div className="px-2 py-2 text-[11px] font-semibold text-muted-foreground">Time</div>
                {weekDays.map((d) => (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => setSelected(d)}
                    className={`border-l border-border/60 px-2 py-2 text-center ${isSameDay(d, new Date()) ? "bg-primary/10" : ""}`}
                  >
                    <span className="block text-[11px] font-bold uppercase tracking-wide">{format(d, "EEE")}</span>
                    <span className="block text-[11px] text-muted-foreground">{format(d, "d MMM")}</span>
                  </button>
                ))}
              </div>
              {HOURS.map((h) => (
                <div key={h} className="grid grid-cols-[4.5rem_repeat(7,1fr)] border-b border-border/40 last:border-b-0">
                  <div className="px-2 py-1.5 text-[11px] text-muted-foreground">{String(h).padStart(2, "0")}:00</div>
                  {weekDays.map((d) => {
                    const key = format(d, "yyyy-MM-dd");
                    const list = (byDay.get(key) ?? []).filter(
                      (it) => Number((it.start_time ?? "09:00").slice(0, 2)) === h,
                    );
                    return (
                      <div
                        key={key + h}
                        onDoubleClick={() => canEdit && openNew(d)}
                        className="min-h-[2.4rem] space-y-1 border-l border-border/40 p-1"
                      >
                        {list.map((it) => (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => canEdit && openEdit(it)}
                            className={`block w-full truncate rounded border px-1.5 py-1 text-left text-[11px] ${colorClass(it.color)}`}
                          >
                            {it.start_time ? `${it.start_time.slice(0, 5)} ` : ""}{it.title}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}


        {view === "calendar" && (<>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const key = format(d, "yyyy-MM-dd");
            const list = byDay.get(key) ?? [];
            const isSel = isSameDay(d, selected);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(d)}
                onDoubleClick={() => canEdit && openNew(d)}
                className={`min-h-[68px] rounded-lg border p-1 text-left transition-colors sm:min-h-[92px] ${
                  isSel ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/50"
                } ${isSameMonth(d, cursor) ? "" : "opacity-45"}`}
              >
                <span className="text-[11px] font-semibold">{format(d, "d")}</span>
                <div className="mt-1 space-y-1">
                  {list.slice(0, 2).map((it) => (
                    <span
                      key={it.id}
                      className={`block truncate rounded border px-1 text-[10px] leading-4 ${colorClass(it.color)}`}
                    >
                      {it.title}
                    </span>
                  ))}
                  {list.length > 2 && (
                    <span className="block text-[10px] text-muted-foreground">+{list.length - 2} more</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{format(selected, "EEEE, d MMMM yyyy")}</h4>
            {canEdit && (
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => openNew(selected)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add to this day
              </Button>
            )}
          </div>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && dayItems.length === 0 && (
            <p className="text-sm text-muted-foreground">No curriculum planned for this day.</p>
          )}
          {dayItems.map((it) => (
            <div key={it.id} className={`rounded-xl border p-3 ${colorClass(it.color)}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{it.title}</span>
                  <Badge variant="outline" className="rounded-full capitalize">{it.category}</Badge>
                  {it.start_time && <span className="text-xs">{it.start_time.slice(0, 5)}</span>}
                  {it.duration_minutes && <span className="text-xs">· {it.duration_minutes} min</span>}
                  {it.completed && <Badge variant="secondary" className="rounded-full">Done</Badge>}
                </div>
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={it.item_date}
                      onChange={(e) => move(it, e.target.value)}
                      className="h-8 w-[9.5rem] bg-card text-xs"
                    />
                    <Button size="sm" variant="outline" onClick={() => openEdit(it)}>Edit</Button>
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-1 text-xs text-foreground/80">
                {it.unit && <p><b>Unit:</b> {it.unit}</p>}
                {it.topic && <p><b>Topic:</b> {it.topic}</p>}
                {it.activities && <p><b>Activities:</b> {it.activities}</p>}
                {it.materials && <p><b>Materials / textbook:</b> {it.materials}</p>}
                {it.notes && <p><b>Notes:</b> {it.notes}</p>}
              </div>
            </div>
          ))}
        </div>
        </>)}

        {view === "map" && (
          <div className="space-y-6">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && unitGroups.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No curriculum items yet.{canEdit ? " Click Add to plan the first unit." : ""}
              </p>
            )}
            {unitGroups.map(([unit, list], gi) => (
              <div key={unit} className="overflow-hidden rounded-xl border border-border/60">
                <div className={`flex flex-wrap items-center gap-2 px-4 py-2 ${UNIT_BANNERS[gi % UNIT_BANNERS.length]}`}>
                  <span className="text-xs font-bold uppercase tracking-widest opacity-80">Unit {gi + 1}</span>
                  <span className="text-sm font-bold">{unit}</span>
                </div>
                <div className="hidden grid-cols-[3rem_1.2fr_1.4fr_1.2fr] gap-2 border-b border-border/60 bg-muted/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:grid">
                  <span>#</span><span>Lesson</span><span>Topic &amp; activities</span><span>Materials &amp; notes</span>
                </div>
                {list.map((it, i) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => canEdit && openEdit(it)}
                    className={`grid w-full grid-cols-1 gap-2 px-3 py-2.5 text-left text-xs transition-colors sm:grid-cols-[3rem_1.2fr_1.4fr_1.2fr] ${i % 2 ? "bg-muted/30" : "bg-card"} ${canEdit ? "hover:bg-muted/50" : "cursor-default"}`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold ${UNIT_BADGES[gi % UNIT_BADGES.length]}`}>
                      {i + 1}
                    </span>
                    <span className="space-y-0.5">
                      <span className="block font-semibold">{it.title}</span>
                      <span className="block capitalize text-muted-foreground">
                        {it.category} · {it.item_date}{it.start_time ? ` ${it.start_time.slice(0, 5)}` : ""}
                      </span>
                      {it.completed && <Badge variant="secondary" className="rounded-full">Done</Badge>}
                    </span>
                    <span className="space-y-0.5 text-foreground/80">
                      {it.topic && <span className="block"><b>Topic:</b> {it.topic}</span>}
                      {it.activities && <span className="block"><b>Activities:</b> {it.activities}</span>}
                      {!it.topic && !it.activities && <span className="text-muted-foreground">—</span>}
                    </span>
                    <span className="space-y-0.5 text-foreground/80">
                      {it.materials && <span className="block"><b>Materials:</b> {it.materials}</span>}
                      {it.notes && <span className="block"><b>Notes:</b> {it.notes}</span>}
                      {!it.materials && !it.notes && <span className="text-muted-foreground">—</span>}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit curriculum item" : "Add curriculum item"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Date</Label>
                <Input type="date" value={form.item_date} onChange={(e) => setForm({ ...form, item_date: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Start time</Label>
                <Input type="time" value={form.start_time ?? ""} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Minutes</Label>
                <Input type="number" min={0} value={form.duration_minutes ?? 60} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Title *</Label>
              <Input aria-invalid={!!errors.title} className={errors.title ? "border-destructive" : ""} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Unit 3 — Talking about routines" />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Colour</Label>
                <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRICULUM_COLORS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Unit *</Label>
                <Input aria-invalid={!!errors.unit} className={errors.unit ? "border-destructive" : ""} value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                {errors.unit && <p className="text-xs text-destructive">{errors.unit}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Topic *</Label>
                <Input aria-invalid={!!errors.topic} className={errors.topic ? "border-destructive" : ""} value={form.topic ?? ""} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
                {errors.topic && <p className="text-xs text-destructive">{errors.topic}</p>}
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Activities</Label>
              <Textarea rows={2} value={form.activities ?? ""} onChange={(e) => setForm({ ...form, activities: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Materials / textbook *</Label>
              <Textarea rows={2} aria-invalid={!!errors.materials} className={errors.materials ? "border-destructive" : ""} value={form.materials ?? ""} onChange={(e) => setForm({ ...form, materials: e.target.value })} />
              {errors.materials && <p className="text-xs text-destructive">{errors.materials}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.completed} onChange={(e) => setForm({ ...form, completed: e.target.checked })} />
              Mark as completed
            </label>

            {editing && (
              <div className="rounded-xl border border-border/60">
                <button
                  type="button"
                  onClick={() => setAuditOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium"
                >
                  <span className="flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Change history</span>
                  <span className="text-xs text-muted-foreground">{auditLoading ? "Loading…" : `${audit.length} entr${audit.length === 1 ? "y" : "ies"}`}</span>
                </button>
                {auditOpen && (
                  <div className="max-h-56 space-y-2 overflow-y-auto border-t border-border/60 p-3 text-xs">
                    {!auditLoading && audit.length === 0 && <p className="text-muted-foreground">No history recorded yet.</p>}
                    {audit.map((a) => (
                      <div key={a.id} className="rounded-lg bg-muted/40 p-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full capitalize">{a.action}</Badge>
                          <span className="font-medium">{a.author}</span>
                          <span className="text-muted-foreground">{format(parseISO(a.changed_at), "d MMM yyyy HH:mm")}</span>
                        </div>
                        {a.action === "updated" && a.changed_fields?.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {a.changed_fields.map((f) => (
                              <li key={f}>
                                <b className="capitalize">{f.replace(/_/g, " ")}:</b>{" "}
                                <span className="text-muted-foreground line-through">{String(a.old_values?.[f] ?? "—")}</span>{" → "}
                                <span>{String(a.new_values?.[f] ?? "—")}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-row justify-between sm:justify-between">
            {editing ? (
              <Button variant="destructive" onClick={remove} disabled={busy}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
            ) : <span />}
            <Button onClick={save} disabled={busy} className="gradient-primary text-primary-foreground">
              <Save className="mr-1 h-4 w-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
