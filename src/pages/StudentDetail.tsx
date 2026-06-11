import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeft, Mail, Phone, Target, Calendar, CheckCircle2, XCircle, Clock, Plus, Save, Pencil, Trash2,
} from "lucide-react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useStudent, Lesson } from "@/hooks/useData";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function StudentDetail() {
  const { id = "" } = useParams();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { profile, notes: loadedNotes, lessons, scores, homework, loading, reload } = useStudent(id);
  const [notes, setNotes] = useState("");
  const [goals, setGoals] = useState("");
  const [level, setLevel] = useState("A1");
  const [gender, setGender] = useState("unspecified");
  const [courseStart, setCourseStart] = useState("");
  const [lessonsPurchased, setLessonsPurchased] = useState("0");
  const [initialized, setInitialized] = useState(false);

  if (loading) return <p className="text-center text-muted-foreground">Loading…</p>;
  if (!profile) return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground">Student not found.</p>
      <Button asChild variant="link"><Link to="/students">Back</Link></Button>
    </div>
  );

  if (!initialized) {
    setNotes(loadedNotes || "");
    setGoals(profile.goals || "");
    setLevel(profile.level);
    setGender(profile.gender || "unspecified");
    setCourseStart(profile.course_start_date || "");
    setLessonsPurchased(String(profile.lessons_purchased ?? 0));
    setInitialized(true);
  }

  const latest = scores[scores.length - 1];
  const attended = lessons.filter((l) => l.attendance !== "scheduled");
  const presentRate = attended.length ? Math.round((attended.filter((l) => l.attendance === "present").length / attended.length) * 100) : 100;
  const lessonsUsed = lessons.filter((l) => l.attendance === "present" || l.attendance === "late").length;
  const lessonsRemaining = Math.max(0, (profile.lessons_purchased ?? 0) - lessonsUsed);

  const saveProfile = async () => {
    const { error: pErr } = await supabase.from("profiles").update({
      goals, level: level as any,
      gender: gender === "unspecified" ? null : gender,
      course_start_date: courseStart || null,
      lessons_purchased: parseInt(lessonsPurchased) || 0,
    }).eq("id", profile.id);
    if (pErr) return toast.error(pErr.message);
    const { error: nErr } = await supabase.from("student_notes").upsert({
      student_id: profile.id,
      notes,
      updated_at: new Date().toISOString(),
    });
    if (nErr) return toast.error(nErr.message);
    toast.success("Profile saved");
    reload();
  };


  const chartData = scores.map((s) => ({ month: s.month, speaking: s.speaking, grammar: s.grammar }));

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/students"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
      </Button>

      <Card className="overflow-hidden border-border/60 shadow-elegant">
        <div className="h-24 gradient-hero" />
        <CardContent className="-mt-12 flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-elegant">
              <AvatarImage src={profile.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.full_name}`} />
              <AvatarFallback>{profile.full_name[0]}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">{profile.full_name}</h2>
                <Badge variant="secondary" className="rounded-full">{profile.level}</Badge>
                {profile.gender && <Badge variant="outline" className="rounded-full capitalize">{profile.gender}</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {profile.email}</span>
                {profile.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {profile.phone}</span>}
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined {profile.joined_at}</span>
                {profile.course_start_date && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Course started {profile.course_start_date}</span>}
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <AddScoreDialog studentId={profile.id} onSaved={reload} />
              <AddLessonDialog studentId={profile.id} onSaved={reload} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Speaking", value: latest?.speaking ?? 0, color: "text-primary" },
          { label: "Grammar", value: latest?.grammar ?? 0, color: "text-accent" },
          { label: "Attendance", value: `${presentRate}%`, color: "text-success" },
          { label: "Lessons left", value: `${lessonsRemaining}/${profile.lessons_purchased ?? 0}`, color: "text-foreground" },
        ].map((s) => (
          <Card key={s.label} className="border-border/60 shadow-elegant">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="rounded-full">
          <TabsTrigger value="overview" className="rounded-full">Overview</TabsTrigger>
          <TabsTrigger value="lessons" className="rounded-full">Lessons</TabsTrigger>
          <TabsTrigger value="homework" className="rounded-full">Homework</TabsTrigger>
          {isAdmin && <TabsTrigger value="edit" className="rounded-full">Edit</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/60 shadow-elegant lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Progress over time</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      <Line type="monotone" dataKey="speaking" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="grammar" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  {chartData.length === 0 && <p className="pt-20 text-center text-sm text-muted-foreground">No scores yet</p>}
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-elegant">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Goals</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{profile.goals || "No goals set yet."}</p></CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lessons">
          <Card className="border-border/60 shadow-elegant">
            <CardContent className="p-6">
              <div className="relative space-y-4 border-l-2 border-border pl-6">
                {lessons.map((l) => (
                  <div key={l.id} className="relative">
                    <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {l.attendance === "present" && <CheckCircle2 className="h-3 w-3" />}
                      {l.attendance === "absent" && <XCircle className="h-3 w-3" />}
                      {l.attendance === "late" && <Clock className="h-3 w-3" />}
                      {l.attendance === "scheduled" && <Calendar className="h-3 w-3" />}
                    </span>
                    <div className="rounded-xl border border-border/60 bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{l.topic}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-full capitalize">{l.attendance}</Badge>
                          {isAdmin && <EditLessonDialog lesson={l} onSaved={reload} />}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{l.lesson_date} · {l.lesson_time}</p>
                      {l.homework && <p className="mt-2 text-sm"><span className="font-medium">Homework: </span>{l.homework}</p>}
                      {l.notes && <p className="mt-1 text-sm text-muted-foreground">{l.notes}</p>}
                    </div>
                  </div>
                ))}
                {lessons.length === 0 && <p className="text-sm text-muted-foreground">No lessons yet.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="homework">
          <Card className="border-border/60 shadow-elegant">
            <CardContent className="space-y-2 p-6">
              {homework.map((h) => (
                <div key={h.id} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                  <CheckCircle2 className={`mt-0.5 h-5 w-5 ${h.completed ? "text-success" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{h.title}</p>
                    {h.description && <p className="text-xs text-muted-foreground">{h.description}</p>}
                    <p className="text-xs text-muted-foreground">Assigned {h.assigned_at}{h.due_at ? ` · Due ${h.due_at}` : ""}</p>
                  </div>
                </div>
              ))}
              {homework.length === 0 && <p className="text-center text-sm text-muted-foreground">No homework yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="edit">
            <Card className="border-border/60 shadow-elegant">
              <CardContent className="space-y-4 p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Level</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["A1","A2","B1","B2","C1","C2"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unspecified">Unspecified</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Course start date</Label>
                    <Input type="date" value={courseStart} onChange={(e) => setCourseStart(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Total lessons purchased</Label>
                    <Input type="number" min="0" value={lessonsPurchased} onChange={(e) => setLessonsPurchased(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2"><Label>Goals</Label><Textarea rows={2} value={goals} onChange={(e) => setGoals(e.target.value)} /></div>
                <div className="grid gap-2"><Label>Teacher notes</Label><Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                <Button onClick={saveProfile} className="gradient-primary text-primary-foreground"><Save className="mr-1 h-4 w-4" /> Save</Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function AddScoreDialog({ studentId, onSaved }: { studentId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [speaking, setSpeaking] = useState("");
  const [grammar, setGrammar] = useState("");
  const save = async () => {
    const { error } = await supabase.from("scores").upsert({
      student_id: studentId, month, year: new Date().getFullYear(),
      speaking: parseInt(speaking) || 0, grammar: parseInt(grammar) || 0,
    }, { onConflict: "student_id,year,month" });
    if (error) return toast.error(error.message);
    toast.success("Score saved");
    setOpen(false); onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline"><Plus className="mr-1 h-4 w-4" /> Score</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add monthly score</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2"><Label>Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2"><Label>Speaking (0–100)</Label><Input type="number" value={speaking} onChange={(e) => setSpeaking(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Grammar (0–100)</Label><Input type="number" value={grammar} onChange={(e) => setGrammar(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter><Button onClick={save} className="gradient-primary text-primary-foreground">Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddLessonDialog({ studentId, onSaved }: { studentId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ lesson_date: "", lesson_time: "10:00", topic: "", zoom_link: "", homework: "", notes: "" });
  const save = async () => {
    if (!form.lesson_date || !form.topic) return toast.error("Date & topic required");
    const { error } = await supabase.from("lessons").insert({
      student_id: studentId,
      lesson_date: form.lesson_date,
      lesson_time: form.lesson_time,
      topic: form.topic,
      zoom_link: form.zoom_link || null,
      homework: form.homework || null,
      notes: form.notes || null,
      attendance: "scheduled",
    });
    if (error) return toast.error(error.message);
    toast.success("Lesson scheduled");
    setOpen(false); onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="gradient-primary text-primary-foreground"><Calendar className="mr-1 h-4 w-4" /> Lesson</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Schedule a lesson</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2"><Label>Date</Label><Input type="date" value={form.lesson_date} onChange={(e) => setForm({ ...form, lesson_date: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Time</Label><Input type="time" value={form.lesson_time} onChange={(e) => setForm({ ...form, lesson_time: e.target.value })} /></div>
          </div>
          <div className="grid gap-2"><Label>Topic</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
          <div className="grid gap-2"><Label>Zoom link</Label><Input value={form.zoom_link} onChange={(e) => setForm({ ...form, zoom_link: e.target.value })} /></div>
          <div className="grid gap-2"><Label>Homework</Label><Textarea rows={2} value={form.homework} onChange={(e) => setForm({ ...form, homework: e.target.value })} /></div>
          <div className="grid gap-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save} className="gradient-primary text-primary-foreground">Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditLessonDialog({ lesson, onSaved }: { lesson: Lesson; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    lesson_date: lesson.lesson_date,
    lesson_time: lesson.lesson_time?.slice(0, 5) ?? "10:00",
    topic: lesson.topic,
    zoom_link: lesson.zoom_link ?? "",
    homework: lesson.homework ?? "",
    notes: lesson.notes ?? "",
    attendance: lesson.attendance,
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase.from("lessons").update({
      lesson_date: form.lesson_date,
      lesson_time: form.lesson_time,
      topic: form.topic,
      zoom_link: form.zoom_link || null,
      homework: form.homework || null,
      notes: form.notes || null,
      attendance: form.attendance as any,
      completed: form.attendance !== "scheduled",
    }).eq("id", lesson.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Lesson updated");
    setOpen(false); onSaved();
  };

  const remove = async () => {
    if (!confirm("Delete this lesson? This cannot be undone.")) return;
    setBusy(true);
    const { error } = await supabase.from("lessons").delete().eq("id", lesson.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Lesson deleted");
    setOpen(false); onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit lesson</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2"><Label>Date</Label><Input type="date" value={form.lesson_date} onChange={(e) => setForm({ ...form, lesson_date: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Time</Label><Input type="time" value={form.lesson_time} onChange={(e) => setForm({ ...form, lesson_time: e.target.value })} /></div>
          </div>
          <div className="grid gap-2"><Label>Topic</Label><Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></div>
          <div className="grid gap-2"><Label>Attendance</Label>
            <Select value={form.attendance} onValueChange={(v) => setForm({ ...form, attendance: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="late">Late</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2"><Label>Zoom link</Label><Input value={form.zoom_link} onChange={(e) => setForm({ ...form, zoom_link: e.target.value })} /></div>
          <div className="grid gap-2"><Label>Homework</Label><Textarea rows={2} value={form.homework} onChange={(e) => setForm({ ...form, homework: e.target.value })} /></div>
          <div className="grid gap-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="destructive" onClick={remove} disabled={busy}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
          <Button onClick={save} disabled={busy} className="gradient-primary text-primary-foreground"><Save className="mr-1 h-4 w-4" /> Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
