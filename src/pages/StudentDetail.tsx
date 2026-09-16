import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeft, Mail, Phone, Target, Calendar, CheckCircle2, XCircle, Clock, Plus, Save, Pencil, Trash2, KeyRound, UserCog, Copy,
} from "lucide-react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { formatLessonsLeft, classesOwing, formatClassesOwing, effectiveLessonsLeft } from "@/lib/lessons";
import { LessonBalanceDisclaimer } from "@/components/LessonBalanceDisclaimer";

import { CefrResultsWidget } from "@/components/CefrResultsWidget";
import { StudentTestResults } from "@/components/StudentTestResults";
import { CurriculumCalendar } from "@/components/CurriculumCalendar";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditableUserAvatar } from "@/components/UserAvatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkSelectBar, useBulkSelect } from "@/components/BulkSelect";
import { RevealCredentialDialog } from "@/components/RevealCredentialDialog";
import { useStudent, Lesson, lessonQuizzes } from "@/hooks/useData";
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
  const [lessonQuery, setLessonQuery] = useState("");
  const [lessonStatus, setLessonStatus] = useState("all");
  const bulk = useBulkSelect();


  const q = lessonQuery.trim().toLowerCase();
  const filteredLessons = lessons.filter((l) => {
    if (lessonStatus !== "all" && l.attendance !== lessonStatus) return false;
    if (!q) return true;
    return [l.topic, l.homework, l.notes, l.lesson_date, l.lesson_time]
      .some((v) => (v ?? "").toString().toLowerCase().includes(q));
  });

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
  const resetAt = profile.lessons_reset_at ?? profile.course_start_date ?? null;
  const lessonsCountedFromReset = lessons.filter((l) =>
    (l.attendance === "present" || l.attendance === "late") &&
    (!resetAt || l.lesson_date >= resetAt)
  ).length;
  const lessonsLeft = effectiveLessonsLeft(profile.lessons_left_override, profile.lessons_purchased, lessonsCountedFromReset);
  const owing = classesOwing(profile.lessons_purchased, lessonsCountedFromReset, profile.lessons_paid_off);


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
            <EditableUserAvatar userId={profile.id} name={profile.full_name} src={profile.avatar_url} onChanged={reload} />
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
            <div className="flex flex-wrap gap-2">
              <AccountActionsDialog studentId={profile.id} email={profile.email} fullName={profile.full_name} phone={profile.phone} isPlaceholder={!!profile.placeholder_email} onSaved={reload} />
              <ResetPasswordButton studentId={profile.id} />
              <AddScoreDialog studentId={profile.id} onSaved={reload} />
              <AddLessonDialog studentId={profile.id} onSaved={reload} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Speaking", value: latest?.speaking ?? 0, color: "text-primary" },
          { label: "Grammar", value: latest?.grammar ?? 0, color: "text-accent" },
          { label: "Attendance", value: `${presentRate}%`, color: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="border-border/60 shadow-elegant">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="border-border/60 shadow-elegant">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Lesson balance</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{formatLessonsLeft(lessonsLeft)}</p>
            <LessonBalanceDisclaimer />
            {profile.lessons_left_override !== null && profile.lessons_left_override !== undefined && (
              <p className="mt-1 text-xs text-muted-foreground">Set manually by an admin</p>
            )}
            {isAdmin && (
              <ManualLessonsDialog
                studentId={profile.id}
                current={lessonsLeft}
                hasOverride={profile.lessons_left_override !== null && profile.lessons_left_override !== undefined}
                onSaved={() => { setInitialized(false); reload(); }}
              />
            )}
          </CardContent>
        </Card>
        <Card className={`border-border/60 shadow-elegant ${owing > 0 ? "border-destructive/40" : ""}`}>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Classes owing</p>
            <p className={`mt-1 text-3xl font-bold ${owing > 0 ? "text-destructive" : "text-success"}`}>
              {formatClassesOwing(owing)}
            </p>
            {isAdmin && (
              <ClassesOwingDialog
                studentId={profile.id}
                owing={owing}
                paidOff={profile.lessons_paid_off ?? 0}
                onSaved={reload}
              />
            )}
          </CardContent>
        </Card>
      </div>




      <Tabs defaultValue="overview">
        <TabsList className="rounded-full">
          <TabsTrigger value="overview" className="rounded-full">Overview</TabsTrigger>
          <TabsTrigger value="lessons" className="rounded-full">Lessons</TabsTrigger>
          <TabsTrigger value="curriculum" className="rounded-full">Curriculum</TabsTrigger>
          <TabsTrigger value="homework" className="rounded-full">Homework</TabsTrigger>
          {isAdmin && <TabsTrigger value="edit" className="rounded-full">Edit</TabsTrigger>}
        </TabsList>

        <TabsContent value="curriculum">
          <CurriculumCalendar studentId={profile.id} canEdit={role === "admin" || role === "teacher"} />
        </TabsContent>


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
          <CefrResultsWidget studentId={profile.id} />
          <StudentTestResults studentId={profile.id} canEdit={role === "admin" || role === "teacher"} />
        </TabsContent>


        <TabsContent value="lessons">
          <Card className="border-border/60 shadow-elegant">
            <CardContent className="space-y-4 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={lessonQuery}
                  onChange={(e) => setLessonQuery(e.target.value)}
                  placeholder="Search topic, homework, lesson links or date…"
                  className="h-9 max-w-sm rounded-full"
                />
                <Select value={lessonStatus} onValueChange={setLessonStatus}>
                  <SelectTrigger className="h-9 w-40 rounded-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
                {(lessonQuery || lessonStatus !== "all") && (
                  <Button variant="ghost" size="sm" className="rounded-full" onClick={() => { setLessonQuery(""); setLessonStatus("all"); }}>Clear</Button>
                )}
                <span className="text-xs text-muted-foreground">{filteredLessons.length} of {lessons.length}</span>
                {isAdmin && (
                  <div className="ml-auto">
                    <BulkSelectBar
                      active={bulk.active}
                      selected={bulk.selected}
                      allIds={filteredLessons.map((l) => l.id)}
                      noun="lesson"
                      onStart={() => bulk.setActive(true)}
                      onStop={bulk.stop}
                      onSelectAll={(ids) => bulk.setSelected(ids)}
                      onClear={bulk.clear}
                      onDelete={async () => {
                        const { error } = await supabase.from("lessons").delete().in("id", bulk.selected);
                        if (error) throw error;
                        toast.success(`${bulk.selected.length} lessons deleted`);
                        bulk.stop();
                        reload();
                      }}
                    />
                  </div>
                )}
              </div>
              <div className="relative space-y-4 border-l-2 border-border pl-6">
                {filteredLessons.map((l) => (
                  <div key={l.id} className="relative">
                    <span className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {l.attendance === "present" && <CheckCircle2 className="h-3 w-3" />}
                      {l.attendance === "absent" && <XCircle className="h-3 w-3" />}
                      {l.attendance === "late" && <Clock className="h-3 w-3" />}
                      {l.attendance === "scheduled" && <Calendar className="h-3 w-3" />}
                    </span>
                    <div className="rounded-xl border border-border/60 bg-card p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="flex items-center gap-2 font-medium">
                          {isAdmin && bulk.active && (
                            <Checkbox checked={bulk.selected.includes(l.id)} onCheckedChange={() => bulk.toggle(l.id)} />
                          )}
                          {l.topic}
                        </p>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-full capitalize">{l.attendance}</Badge>
                          {isAdmin && <EditLessonDialog lesson={l} onSaved={reload} />}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{l.lesson_date} · {l.lesson_time}</p>
                      {lessonQuizzes(l).map((q, i) => (
                        <p key={i} className="mt-2 text-sm"><span className="font-medium">{q.name}: </span>
                          <span className="font-semibold text-primary">{q.score}{q.max != null ? ` / ${q.max}` : ""}</span>
                        </p>
                      ))}
                      {l.homework && <p className="mt-2 text-sm"><span className="font-medium">Homework: </span>{l.homework}</p>}
                      {l.notes && <p className="mt-1 text-sm text-muted-foreground"><span className="font-medium">Lesson links:</span> {l.notes}</p>}
                    </div>
                  </div>
                ))}

                {filteredLessons.length === 0 && <p className="text-sm text-muted-foreground">{lessons.length === 0 ? "No lessons yet." : "No lessons match your search."}</p>}
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
                  {isAdmin && (
                    <ConfirmDeleteButton
                      title="Delete this homework?"
                      description="The homework entry is permanently removed for this student."
                      onConfirm={async () => {
                        const { error } = await supabase.from("homework").delete().eq("id", h.id);
                        if (error) throw error;
                        toast.success("Homework deleted"); reload();
                      }}
                    />
                  )}
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
  const [quizzes, setQuizzes] = useState([{ name: "", score: "", max: "" }]);
  const setQuiz = (i: number, patch: Partial<{ name: string; score: string; max: string }>) =>
    setQuizzes((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const save = async () => {
    if (!form.lesson_date || !form.topic) return toast.error("Date & topic required");
    const savedQuizzes = quizzes
      .filter((q) => q.name.trim() || q.score !== "" || q.max !== "")
      .map((q) => ({ name: q.name.trim() || "Quiz", score: q.score === "" ? null : Number(q.score), max: q.max === "" ? null : Number(q.max) }));
    const first = savedQuizzes[0];
    const { error } = await supabase.from("lessons").insert({
      student_id: studentId,
      lesson_date: form.lesson_date,
      lesson_time: form.lesson_time,
      topic: form.topic,
      zoom_link: form.zoom_link || null,
      homework: form.homework || null,
      notes: form.notes || null,
      quizzes: savedQuizzes.length ? savedQuizzes : null,
      quiz_name: first?.name ?? null,
      quiz_score: first ? first.score : null,
      quiz_max: first ? first.max : null,
      attendance: "scheduled",
    } as any);
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
          <div className="grid gap-2"><Label>Lesson links</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Quiz / test scores</Label>
            {quizzes.map((q, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_5rem_auto] items-center gap-2">
                <Input placeholder="Quiz / test name" value={q.name} onChange={(e) => setQuiz(i, { name: e.target.value })} />
                <Input type="number" placeholder="Score" value={q.score} onChange={(e) => setQuiz(i, { score: e.target.value })} />
                <Input type="number" placeholder="Out of" value={q.max} onChange={(e) => setQuiz(i, { max: e.target.value })} />
                {quizzes.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQuizzes((qs) => qs.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setQuizzes((qs) => [...qs, { name: "", score: "", max: "" }])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add another test
            </Button>
          </div>
        </div>
        <DialogFooter><Button onClick={save} className="gradient-primary text-primary-foreground">Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditLessonDialog({ lesson, onSaved }: { lesson: Lesson; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const toRow = (q: { name?: string | null; score?: number | null; max?: number | null }) => ({
    name: q.name ?? "",
    score: q.score != null ? String(q.score) : "",
    max: q.max != null ? String(q.max) : "",
  });
  const [form, setForm] = useState({
    lesson_date: lesson.lesson_date,
    lesson_time: lesson.lesson_time?.slice(0, 5) ?? "10:00",
    topic: lesson.topic,
    zoom_link: lesson.zoom_link ?? "",
    homework: lesson.homework ?? "",
    notes: lesson.notes ?? "",
    attendance: lesson.attendance,
  });
  const [quizzes, setQuizzes] = useState(() => {
    const rows = lessonQuizzes(lesson).map(toRow);
    return rows.length ? rows : [{ name: "", score: "", max: "" }];
  });
  const setQuiz = (i: number, patch: Partial<{ name: string; score: string; max: string }>) =>
    setQuizzes((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const savedQuizzes = quizzes
      .filter((q) => q.name.trim() || q.score !== "" || q.max !== "")
      .map((q) => ({ name: q.name.trim() || "Quiz", score: q.score === "" ? null : Number(q.score), max: q.max === "" ? null : Number(q.max) }));
    const first = savedQuizzes[0];
    const { error } = await supabase.from("lessons").update({
      lesson_date: form.lesson_date,
      lesson_time: form.lesson_time,
      topic: form.topic,
      zoom_link: form.zoom_link || null,
      homework: form.homework || null,
      notes: form.notes || null,
      quizzes: savedQuizzes.length ? savedQuizzes : null,
      quiz_name: first?.name ?? null,
      quiz_score: first ? first.score : null,
      quiz_max: first ? first.max : null,
      attendance: form.attendance as any,
      completed: form.attendance !== "scheduled",
    } as any).eq("id", lesson.id);
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
          <div className="grid gap-2"><Label>Lesson links</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Quiz / test scores</Label>
            {quizzes.map((q, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_5rem_auto] items-center gap-2">
                <Input placeholder="Quiz / test name" value={q.name} onChange={(e) => setQuiz(i, { name: e.target.value })} />
                <Input type="number" placeholder="Score" value={q.score} onChange={(e) => setQuiz(i, { score: e.target.value })} />
                <Input type="number" placeholder="Out of" value={q.max} onChange={(e) => setQuiz(i, { max: e.target.value })} />
                {quizzes.length > 1 && (
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setQuizzes((qs) => qs.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setQuizzes((qs) => [...qs, { name: "", score: "", max: "" }])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add another test
            </Button>
          </div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="destructive" onClick={remove} disabled={busy}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>
          <Button onClick={save} disabled={busy} className="gradient-primary text-primary-foreground"><Save className="mr-1 h-4 w-4" /> Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordButton({ studentId }: { studentId: string }) {
  const [busy, setBusy] = useState(false);
  const [tempPwd, setTempPwd] = useState<string | null>(null);
  const run = async () => {
    if (!confirm("Reset this student's password? Their current password will stop working.")) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-reset-password", { body: { student_id: studentId } });
    setBusy(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error?.message ?? "Failed");
    if ((data as any)?.mode === "email_sent") {
      return toast.success("Password reset link emailed to the student");
    }
    setTempPwd((data as any)?.password as string);
  };
  return (
    <>
      <Button variant="outline" onClick={run} disabled={busy}>
        <KeyRound className="mr-1 h-4 w-4" /> Reset password
      </Button>
      <RevealCredentialDialog
        open={!!tempPwd}
        onOpenChange={(v) => !v && setTempPwd(null)}
        title="Temporary password"
        description="This account has no inbox, so the password must be handed over directly."
        value={tempPwd ?? ""}
      />
    </>
  );
}

function AccountActionsDialog({ studentId, email, fullName, phone, isPlaceholder, onSaved }: {
  studentId: string; email: string; fullName: string; phone: string | null; isPlaceholder: boolean; onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email, full_name: fullName, phone: phone ?? "" });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-update-student", {
      body: {
        student_id: studentId,
        email: form.email !== email ? form.email : undefined,
        full_name: form.full_name !== fullName ? form.full_name : undefined,
        phone: form.phone !== (phone ?? "") ? form.phone : undefined,
      },
    });
    setBusy(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error?.message ?? "Failed");
    toast.success("Account updated — student history preserved");
    setOpen(false);
    onSaved();
  };

  const copy = () => { navigator.clipboard.writeText(email); toast.success("Email copied"); };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><UserCog className="mr-1 h-4 w-4" /> Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Account details</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          {isPlaceholder && (
            <p className="rounded-md bg-secondary/60 p-2 text-xs text-muted-foreground">
              This account uses a placeholder email. Replace it with a real address any time — all lessons, tests and homework will stay.
            </p>
          )}
          <div className="grid gap-2">
            <Label>Full name</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <div className="flex gap-2">
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Button variant="outline" size="icon" onClick={copy}><Copy className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy} className="gradient-primary text-primary-foreground"><Save className="mr-1 h-4 w-4" /> Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ClassesOwingDialog({
  studentId, owing, paidOff, onSaved,
}: { studentId: string; owing: number; paidOff: number; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(String(owing));
  const [busy, setBusy] = useState(false);

  const markPaid = async () => {
    const n = Math.max(0, Math.min(owing, parseInt(count) || 0));
    if (n === 0) return toast.error("Enter how many classes were paid for");
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ lessons_paid_off: paidOff + n } as any)
      .eq("id", studentId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${n} class${n === 1 ? "" : "es"} marked as paid`);
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setCount(String(owing)); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="mt-3 rounded-full" disabled={owing === 0}>
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Mark classes as paid
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Mark classes as paid</DialogTitle></DialogHeader>
        <div className="grid gap-2">
          <Label>Classes paid for (max {owing})</Label>
          <Input type="number" min={1} max={owing} value={count} onChange={(e) => setCount(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            This only clears the owing count — the lesson balance and lesson history stay unchanged.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={markPaid} disabled={busy} className="gradient-primary text-primary-foreground">Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualLessonsDialog({
  studentId, current, hasOverride, onSaved,
}: { studentId: string; current: number; hasOverride: boolean; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(String(current));
  const [busy, setBusy] = useState(false);

  const save = async (value: number | null) => {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ lessons_left_override: value } as any)
      .eq("id", studentId);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(value === null ? "Back to automatic calculation" : `Lessons left set to ${value}`);
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setCount(String(current)); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="mt-3 rounded-full">
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Reset lessons left
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Set lessons left manually</DialogTitle></DialogHeader>
        <div className="grid gap-2">
          <Label>Lessons remaining</Label>
          <Input type="number" min={0} value={count} onChange={(e) => setCount(e.target.value)} />
          <p className="text-xs text-muted-foreground">
            This manual number overrides the automatic calculation until you change or clear it.
            Lesson history, packages and invoices stay untouched.
          </p>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          {hasOverride ? (
            <Button variant="outline" onClick={() => save(null)} disabled={busy}>Use automatic</Button>
          ) : <span />}
          <Button
            onClick={() => save(Math.max(0, parseInt(count) || 0))}
            disabled={busy}
            className="gradient-primary text-primary-foreground"
          >
            <Save className="mr-1 h-4 w-4" /> Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
