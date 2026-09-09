import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { BookOpen, Plus, Save, Users, Settings2, Pencil, Check, X, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/hooks/useData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CURRICULUM_COLORS } from "@/components/CurriculumCalendar";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";

interface Option {
  id: string;
  kind: "unit" | "topic";
  name: string;
  parent_unit: string | null;
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = ["lesson", "unit", "topic", "activity", "material", "assessment", "review"];
const NONE = "__none__";

export default function CurriculumPlan() {
  const { students, loading: studentsLoading } = useStudents();
  const [options, setOptions] = useState<Option[]>([]);
  const [optLoading, setOptLoading] = useState(true);

  const loadOptions = useCallback(async () => {
    setOptLoading(true);
    const { data, error } = await supabase
      .from("curriculum_options")
      .select("id, kind, name, parent_unit, is_active, sort_order")
      .order("kind")
      .order("sort_order")
      .order("name");
    if (error) toast.error(error.message);
    setOptions((data as unknown as Option[]) ?? []);
    setOptLoading(false);
  }, []);

  useEffect(() => { loadOptions(); }, [loadOptions]);

  const units = useMemo(() => options.filter((o) => o.kind === "unit"), [options]);
  const topics = useMemo(() => options.filter((o) => o.kind === "topic"), [options]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Curriculum Plan</h2>
        <p className="text-sm text-muted-foreground">
          Build one plan and apply it to many students at once, and keep your unit/topic dropdowns consistent.
        </p>
      </div>

      <Tabs defaultValue="student">
        <TabsList className="rounded-full">
          <TabsTrigger value="student" className="rounded-full">Per-student plan</TabsTrigger>
          <TabsTrigger value="plan" className="rounded-full">Bulk plan builder</TabsTrigger>
          <TabsTrigger value="options" className="rounded-full">Units &amp; Topics</TabsTrigger>
        </TabsList>

        <TabsContent value="student" className="mt-4">
          <StudentPlan students={students} loading={studentsLoading} />
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <PlanBuilder
            students={students}
            studentsLoading={studentsLoading}
            units={units.filter((u) => u.is_active)}
            topics={topics.filter((t) => t.is_active)}
          />
        </TabsContent>

        <TabsContent value="options" className="mt-4">
          <OptionsManager units={units} topics={topics} loading={optLoading} reload={loadOptions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* --------------------------- Per-student planner --------------------------- */

function StudentPlan({ students, loading }: { students: { id: string; full_name: string }[]; loading: boolean }) {
  const [studentId, setStudentId] = useState<string>("");

  return (
    <div className="space-y-4">
      <Card className="border-border/60 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Choose a student
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className="w-full sm:w-[20rem]">
              <SelectValue placeholder={loading ? "Loading…" : "Select a student"} />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {studentId ? (
        <CurriculumCalendar studentId={studentId} canEdit />
      ) : (
        <p className="text-sm text-muted-foreground">Pick a student to build and edit their own curriculum plan.</p>
      )}
    </div>
  );
}


/* ------------------------------ Plan builder ------------------------------ */

function PlanBuilder({
  students, studentsLoading, units, topics,
}: {
  students: { id: string; full_name: string }[];
  studentsLoading: boolean;
  units: Option[];
  topics: Option[];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    item_date: format(new Date(), "yyyy-MM-dd"),
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
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const topicChoices = useMemo(
    () => topics.filter((t) => !t.parent_unit || !form.unit || t.parent_unit === form.unit),
    [topics, form.unit],
  );

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Title is required";
    if (!form.unit) next.unit = "Unit is required";
    if (!form.topic) next.topic = "Topic is required";
    if (!form.materials.trim()) next.materials = "Materials / textbook is required";
    if (!form.item_date) next.item_date = "Date is required";
    if (!selected.length) next.students = "Select at least one student";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const apply = async () => {
    if (!validate()) return toast.error("Fill in the highlighted fields");
    setBusy(true);
    const rows = selected.map((student_id) => ({
      student_id,
      item_date: form.item_date,
      start_time: form.start_time || null,
      duration_minutes: Number(form.duration_minutes) || null,
      title: form.title.trim(),
      category: form.category,
      unit: form.unit,
      topic: form.topic,
      activities: form.activities || null,
      materials: form.materials || null,
      notes: form.notes || null,
      color: form.color,
      completed: false,
    }));
    const { error } = await supabase.from("curriculum_items").insert(rows as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Added to ${rows.length} student${rows.length > 1 ? "s" : ""}`);
    setForm((f) => ({ ...f, title: "", activities: "", notes: "" }));
  };

  const err = (k: string) => (errors[k] ? "border-destructive" : "");

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="border-border/60 shadow-elegant">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Students
          </CardTitle>
          <Button
            size="sm" variant="outline" className="h-7 rounded-full px-3"
            onClick={() => setSelected(selected.length === students.length ? [] : students.map((s) => s.id))}
          >
            {selected.length === students.length && students.length > 0 ? "Clear" : "Select all"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {errors.students && <p className="text-xs text-destructive">{errors.students}</p>}
          {studentsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students yet.</p>
          ) : (
            <div className="max-h-[26rem] space-y-1 overflow-y-auto pr-1">
              {students.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60">
                  <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
                  <span className="text-sm">{s.full_name}</span>
                </label>
              ))}
            </div>
          )}
          <p className="pt-1 text-xs text-muted-foreground">{selected.length} selected</p>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" /> Lesson plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v, topic: "" })}>
                <SelectTrigger className={err("unit")}><SelectValue placeholder="Choose a unit" /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.unit && <p className="text-xs text-destructive">{errors.unit}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Topic</Label>
              <Select value={form.topic} onValueChange={(v) => setForm({ ...form, topic: v })}>
                <SelectTrigger className={err("topic")}><SelectValue placeholder="Choose a topic" /></SelectTrigger>
                <SelectContent>
                  {topicChoices.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.topic && <p className="text-xs text-destructive">{errors.topic}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Title</Label>
              <Input value={form.title} className={err("title")} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Talking about routines" />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.item_date} className={err("item_date")} onChange={(e) => setForm({ ...form, item_date: e.target.value })} />
              {errors.item_date && <p className="text-xs text-destructive">{errors.item_date}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start time</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Minutes</Label>
                <Input type="number" min={15} step={15} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRICULUM_COLORS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Materials / textbook</Label>
              <Input value={form.materials} className={err("materials")} onChange={(e) => setForm({ ...form, materials: e.target.value })} />
              {errors.materials && <p className="text-xs text-destructive">{errors.materials}</p>}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Activities</Label>
              <Textarea rows={2} value={form.activities} onChange={(e) => setForm({ ...form, activities: e.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <Button className="gradient-primary text-primary-foreground" disabled={busy} onClick={apply}>
            <Save className="mr-1 h-4 w-4" /> Apply to {selected.length || 0} student{selected.length === 1 ? "" : "s"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* --------------------------- Units & topics admin -------------------------- */

function OptionsManager({
  units, topics, loading, reload,
}: { units: Option[]; topics: Option[]; loading: boolean; reload: () => void }) {
  const [newUnit, setNewUnit] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newTopicUnit, setNewTopicUnit] = useState(NONE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const add = async (kind: "unit" | "topic", name: string, parent: string | null) => {
    if (!name.trim()) return toast.error("Enter a name");
    const { error } = await supabase
      .from("curriculum_options")
      .insert({ kind, name: name.trim(), parent_unit: parent } as never);
    if (error) return toast.error(error.message);
    toast.success(kind === "unit" ? "Unit added" : "Topic added");
    setNewUnit(""); setNewTopic("");
    reload();
  };

  const rename = async (o: Option) => {
    if (!editName.trim()) return toast.error("Name cannot be empty");
    const { error } = await supabase
      .from("curriculum_options")
      .update({ name: editName.trim() } as never)
      .eq("id", o.id);
    if (error) return toast.error(error.message);
    setEditingId(null);
    toast.success("Renamed");
    reload();
  };

  const toggleActive = async (o: Option) => {
    const { error } = await supabase
      .from("curriculum_options")
      .update({ is_active: !o.is_active } as never)
      .eq("id", o.id);
    if (error) return toast.error(error.message);
    toast.success(o.is_active ? "Deactivated" : "Reactivated");
    reload();
  };

  const remove = async (o: Option) => {
    const { error } = await supabase.from("curriculum_options").delete().eq("id", o.id);
    if (error) throw new Error(error.message);
    toast.success("Deleted");
    reload();
  };

  const row = (o: Option) => (
    <div key={o.id} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
      {editingId === o.id ? (
        <>
          <Input className="h-8" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => rename(o)}><Check className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
        </>
      ) : (
        <>
          <span className={`flex-1 text-sm ${o.is_active ? "" : "text-muted-foreground line-through"}`}>{o.name}</span>
          {o.parent_unit && <Badge variant="outline" className="text-[10px]">{o.parent_unit}</Badge>}
          {!o.is_active && <Badge variant="outline" className="text-[10px]">inactive</Badge>}
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Rename"
            onClick={() => { setEditingId(o.id); setEditName(o.name); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={o.is_active ? "Deactivate" : "Reactivate"}
            onClick={() => toggleActive(o)}>
            {o.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          <ConfirmDeleteButton
            onConfirm={() => remove(o)}
            title={`Delete "${o.name}"?`}
            description="This removes the dropdown option. Existing curriculum items keep their saved text."
          />
        </>
      )}
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4 text-primary" /> Units</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="New unit name" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} />
            <Button onClick={() => add("unit", newUnit, null)}><Plus className="h-4 w-4" /></Button>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
            : units.length === 0 ? <p className="text-sm text-muted-foreground">No units yet.</p>
            : <div className="space-y-2">{units.map(row)}</div>}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Settings2 className="h-4 w-4 text-primary" /> Topics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input className="min-w-[10rem] flex-1" placeholder="New topic name" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} />
            <Select value={newTopicUnit} onValueChange={setNewTopicUnit}>
              <SelectTrigger className="w-[11rem]"><SelectValue placeholder="Unit (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Any unit</SelectItem>
                {units.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => add("topic", newTopic, newTopicUnit === NONE ? null : newTopicUnit)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
            : topics.length === 0 ? <p className="text-sm text-muted-foreground">No topics yet.</p>
            : <div className="space-y-2">{topics.map(row)}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
