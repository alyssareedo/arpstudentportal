import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, BookOpen, CalendarDays, Target, Flame } from "lucide-react";
import { formatLessonsLeft } from "@/lib/lessons";

export default function Roadmap() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const [{ data: prof }, { data: less }, { data: hw }, { data: assigns }, { data: prog }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
      supabase.from("lessons").select("*").eq("student_id", user!.id).order("lesson_date", { ascending: false }),
      supabase.from("homework").select("*").eq("student_id", user!.id).order("created_at", { ascending: false }),
      supabase.from("material_assignments").select("*, materials(*)").eq("student_id", user!.id),
      supabase.from("material_progress").select("*").eq("student_id", user!.id),
    ]);
    setProfile(prof);
    setLessons(less ?? []);
    setHomework(hw ?? []);
    setMaterials(assigns ?? []);
    setProgress(Object.fromEntries((prog ?? []).map((p: any) => [p.material_id, p])));
  };

  const completedLessons = lessons.filter(l => !l.is_planned);
  const upcomingLessons = lessons.filter(l => l.is_planned && l.planned_date);
  const purchased = profile?.lessons_purchased ?? 0;
  const resetAt = profile?.lessons_reset_at;
  const attended = completedLessons.filter(l => !resetAt || new Date(l.lesson_date) >= new Date(resetAt)).length;
  const remaining = Math.max(0, purchased - attended);
  const completionPct = purchased ? Math.round((attended / purchased) * 100) : 0;

  const matDone = materials.filter(m => progress[m.material_id]?.status === "completed").length;
  const matPct = materials.length ? Math.round((matDone / materials.length) * 100) : 0;

  const openHw = homework.filter(h => h.status !== "completed");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Flame className="h-4 w-4" /> Lessons attended</div><div className="text-2xl font-bold">{attended}/{purchased}</div><Progress value={completionPct} className="mt-2 h-1.5" /></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-4 w-4" /> Lesson balance</div><div className="text-2xl font-bold text-primary">{formatLessonsLeft(remaining)}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2 text-xs text-muted-foreground"><BookOpen className="h-4 w-4" /> Materials completed</div><div className="text-2xl font-bold">{matDone}/{materials.length}</div><Progress value={matPct} className="mt-2 h-1.5" /></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Target className="h-4 w-4" /> Level</div><div className="text-2xl font-bold">{profile?.cefr_level || "—"}</div></CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Upcoming topics</CardTitle></CardHeader>
          <CardContent>
            {upcomingLessons.length === 0 ? <p className="text-sm text-muted-foreground">No planned lessons yet.</p> : (
              <ul className="space-y-2">{upcomingLessons.map(l => (
                <li key={l.id} className="flex items-start gap-2 rounded border p-2">
                  <Circle className="mt-0.5 h-4 w-4 text-primary" />
                  <div><div className="font-medium text-sm">{l.topic ?? "Lesson"}</div><div className="text-xs text-muted-foreground">{l.planned_date}</div></div>
                </li>
              ))}</ul>
            )}
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle>Recent completed lessons</CardTitle></CardHeader>
          <CardContent>
            {completedLessons.length === 0 ? <p className="text-sm text-muted-foreground">No lessons yet.</p> : (
              <ul className="space-y-2">{completedLessons.slice(0, 6).map(l => (
                <li key={l.id} className="flex items-start gap-2 rounded border p-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                  <div><div className="font-medium text-sm">{l.topic ?? "Lesson"}</div><div className="text-xs text-muted-foreground">{l.lesson_date}</div></div>
                </li>
              ))}</ul>
            )}
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle>Homework</CardTitle></CardHeader>
          <CardContent>
            {openHw.length === 0 ? <p className="text-sm text-muted-foreground">Nothing pending. 🎉</p> : (
              <ul className="space-y-2">{openHw.map(h => (
                <li key={h.id} className="flex items-start justify-between gap-2 rounded border p-2">
                  <div><div className="font-medium text-sm">{h.title}</div>{h.due_date && <div className="text-xs text-muted-foreground">Due {h.due_date}</div>}</div>
                  <Badge variant="outline">{h.status}</Badge>
                </li>
              ))}</ul>
            )}
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle>Recommended materials</CardTitle></CardHeader>
          <CardContent>
            {materials.length === 0 ? <p className="text-sm text-muted-foreground">No materials assigned.</p> : (
              <ul className="space-y-2">{materials.slice(0, 6).map(m => {
                const done = progress[m.material_id]?.status === "completed";
                return (
                  <li key={m.id} className="flex items-start gap-2 rounded border p-2">
                    {done ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" /> : <Circle className="mt-0.5 h-4 w-4" />}
                    <div><div className="font-medium text-sm">{m.materials?.title}</div><div className="text-xs text-muted-foreground">{m.materials?.type}{m.materials?.cefr_level ? ` · ${m.materials.cefr_level}` : ""}</div></div>
                  </li>
                );
              })}</ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
