import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import {
  ArrowLeft,
  Mail,
  Phone,
  Target,
  Share2,
  Upload,
  FileText,
  Video,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getStudent, getStudentLessons } from "@/data/mockData";

export default function StudentDetail() {
  const { id = "" } = useParams();
  const student = getStudent(id);
  const studentLessons = getStudentLessons(id);
  const [notes, setNotes] = useState(student?.notes ?? "");

  if (!student) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Student not found.</p>
        <Button asChild variant="link"><Link to="/students">Back to students</Link></Button>
      </div>
    );
  }

  const latest = student.scores[student.scores.length - 1];
  const attendance = studentLessons.filter((l) => l.attendance !== "scheduled");
  const presentRate = attendance.length
    ? Math.round((attendance.filter((l) => l.attendance === "present").length / attendance.length) * 100)
    : 100;

  const share = () => {
    const url = `${window.location.origin}/students/${student.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Shareable student link copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/students"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Link>
      </Button>

      {/* Header */}
      <Card className="overflow-hidden border-border/60 shadow-elegant">
        <div className="h-24 gradient-hero" />
        <CardContent className="-mt-12 flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <Avatar className="h-24 w-24 ring-4 ring-background shadow-elegant">
              <AvatarImage src={student.avatarUrl} />
              <AvatarFallback>{student.name[0]}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">{student.name}</h2>
                <Badge variant="secondary" className="rounded-full">{student.level}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {student.email}</span>
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {student.phone}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined {student.joinedAt}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={share}>
              <Share2 className="mr-1 h-4 w-4" /> Share
            </Button>
            <Button className="gradient-primary text-primary-foreground">
              <Calendar className="mr-1 h-4 w-4" /> Schedule lesson
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Speaking", value: latest.speaking, color: "text-primary" },
          { label: "Grammar", value: latest.grammar, color: "text-accent" },
          { label: "Attendance", value: `${presentRate}%`, color: "text-success" },
          { label: "Lessons", value: studentLessons.length, color: "text-foreground" },
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
          <TabsTrigger value="files" className="rounded-full">Files</TabsTrigger>
          <TabsTrigger value="notes" className="rounded-full">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border/60 shadow-elegant lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Progress over time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer>
                    <LineChart data={student.scores}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      <Line type="monotone" dataKey="speaking" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="grammar" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{student.goals}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="lessons">
          <Card className="border-border/60 shadow-elegant">
            <CardContent className="p-6">
              <div className="relative space-y-4 border-l-2 border-border pl-6">
                {studentLessons.map((l) => (
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
                        <Badge variant="outline" className="rounded-full capitalize">{l.attendance}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{l.date} · {l.time}</p>
                      {l.homework && <p className="mt-2 text-sm"><span className="font-medium">Homework: </span>{l.homework}</p>}
                      {l.notes && <p className="mt-1 text-sm text-muted-foreground">{l.notes}</p>}
                      {(l.zoomLink || l.teamsLink) && (
                        <Badge variant="secondary" className="mt-2 rounded-full">
                          <Video className="mr-1 h-3 w-3" />
                          {l.zoomLink ? "Zoom" : "Teams"}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {studentLessons.length === 0 && (
                  <p className="text-sm text-muted-foreground">No lessons yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="homework">
          <Card className="border-border/60 shadow-elegant">
            <CardContent className="space-y-2 p-6">
              {studentLessons.filter((l) => l.homework).map((l) => (
                <div key={l.id} className="flex items-start gap-3 rounded-xl border border-border/60 p-3">
                  <CheckCircle2 className={`mt-0.5 h-5 w-5 ${l.completed ? "text-success" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{l.homework}</p>
                    <p className="text-xs text-muted-foreground">From "{l.topic}" · {l.date}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card className="border-border/60 shadow-elegant">
            <CardContent className="space-y-3 p-6">
              <Button variant="outline" className="w-full border-dashed py-8">
                <Upload className="mr-2 h-4 w-4" /> Upload PDF or assignment
              </Button>
              {student.files.map((f) => (
                <div key={f.name} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.size} · uploaded {f.uploadedAt}</p>
                  </div>
                </div>
              ))}
              {student.files.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">No files yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="border-border/60 shadow-elegant">
            <CardContent className="space-y-3 p-6">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={8} />
              <Button onClick={() => toast.success("Notes saved")} className="gradient-primary text-primary-foreground">
                Save notes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
