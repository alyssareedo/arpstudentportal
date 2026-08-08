import { Navigate } from "react-router-dom";
import { Mail, Calendar, Target, BookOpen, CheckCircle2, } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EditableUserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useStudent } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatLessonsLeft } from "@/lib/lessons";
import { BalanceSourceNote } from "@/components/BalanceSourceNote";

export default function MyProfile() {
  const { user, loading: authLoading } = useAuth();
  const { profile, lessons, scores, homework, loading, reload } = useStudent(user?.id);

  if (authLoading || loading) return <p className="text-center text-muted-foreground">Loading…</p>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile) return <p className="text-center text-muted-foreground">Profile not found.</p>;

  const latest = scores[scores.length - 1];
  const attended = lessons.filter((l) => l.attendance !== "scheduled");
  const presentRate = attended.length ? Math.round((attended.filter((l) => l.attendance === "present").length / attended.length) * 100) : 100;
  const upcoming = lessons.filter((l) => l.attendance === "scheduled");
  const resetAt = profile.lessons_reset_at ?? profile.course_start_date ?? null;
  const usedSinceReset = lessons.filter((l) =>
    (l.attendance === "present" || l.attendance === "late") && (!resetAt || l.lesson_date >= resetAt)
  ).length;
  const remaining = Math.max(0, (profile.lessons_purchased ?? 0) - usedSinceReset);
  const chartData = scores.map((s) => ({ month: s.month, speaking: s.speaking, grammar: s.grammar }));

  const toggleHw = async (id: string, completed: boolean) => {
    const { error } = await supabase.from("homework").update({ completed: !completed, completed_at: !completed ? new Date().toISOString() : null }).eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/60 shadow-elegant">
        <div className="h-24 gradient-hero" />
        <CardContent className="-mt-12 flex flex-col gap-4 p-6 md:flex-row md:items-end">
          <EditableUserAvatar userId={profile.id} name={profile.full_name} src={profile.avatar_url} onChanged={reload} />

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{profile.full_name}</h2>
              <Badge variant="secondary" className="rounded-full">{profile.level}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {profile.email}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Joined {profile.joined_at}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Speaking", value: latest?.speaking ?? 0, color: "text-primary" },
          { label: "Grammar", value: latest?.grammar ?? 0, color: "text-accent" },
          { label: "Attendance", value: `${presentRate}%`, color: "text-success" },
          { label: "Lesson balance", value: formatLessonsLeft(remaining), color: "text-foreground" },
        ].map((s) => (
          <Card key={s.label} className="border-border/60 shadow-elegant">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <BalanceSourceNote studentId={profile.id} resetAt={resetAt} purchased={profile.lessons_purchased ?? 0} used={usedSinceReset} />

      <Tabs defaultValue="progress">
        <TabsList className="rounded-full">
          <TabsTrigger value="progress" className="rounded-full">Progress</TabsTrigger>
          <TabsTrigger value="lessons" className="rounded-full">My lessons</TabsTrigger>
          <TabsTrigger value="homework" className="rounded-full">Homework</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <Card className="border-border/60 shadow-elegant">
            <CardHeader><CardTitle className="text-base">My progress</CardTitle></CardHeader>
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
                {chartData.length === 0 && <p className="pt-20 text-center text-sm text-muted-foreground">Scores will appear here after your teacher records them.</p>}
              </div>
            </CardContent>
          </Card>
          {profile.goals && (
            <Card className="border-border/60 shadow-elegant">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> My goals</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{profile.goals}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="lessons" className="space-y-3">
          {upcoming.length > 0 && (
            <Card className="border-border/60 shadow-elegant">
              <CardHeader><CardTitle className="text-base">Upcoming</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {upcoming.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
                    <div>
                      <p className="text-sm font-medium">{l.topic}</p>
                      <p className="text-xs text-muted-foreground">{l.lesson_date} at {l.lesson_time}</p>
                    </div>
                    {(l.zoom_link || l.teams_link) && (
                      <Button asChild size="sm" variant="outline" className="rounded-full">
                        <a href={l.zoom_link || l.teams_link!} target="_blank" rel="noreferrer">Join</a>
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Card className="border-border/60 shadow-elegant">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />Past lessons</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {lessons.filter((l) => l.attendance !== "scheduled").map((l) => (
                <div key={l.id} className="rounded-xl border border-border/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{l.topic}</p>
                    <Badge variant="outline" className="rounded-full capitalize">{l.attendance}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{l.lesson_date}</p>
                  {l.notes && <p className="mt-1 text-sm text-muted-foreground">{l.notes}</p>}
                </div>
              ))}
              {lessons.filter((l) => l.attendance !== "scheduled").length === 0 && (
                <p className="text-center text-sm text-muted-foreground">No past lessons yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="homework">
          <Card className="border-border/60 shadow-elegant">
            <CardContent className="space-y-2 p-6">
              {homework.map((h) => (
                <button key={h.id} onClick={() => toggleHw(h.id, h.completed)} className="flex w-full items-start gap-3 rounded-xl border border-border/60 p-3 text-left transition hover:bg-secondary/40">
                  <CheckCircle2 className={`mt-0.5 h-5 w-5 ${h.completed ? "text-success" : "text-muted-foreground"}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${h.completed ? "line-through opacity-60" : ""}`}>{h.title}</p>
                    {h.description && <p className="text-xs text-muted-foreground">{h.description}</p>}
                    <p className="text-xs text-muted-foreground">Assigned {h.assigned_at}{h.due_at ? ` · Due ${h.due_at}` : ""}</p>
                  </div>
                </button>
              ))}
              {homework.length === 0 && <p className="text-center text-sm text-muted-foreground">No homework assigned yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
