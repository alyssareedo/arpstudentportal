import { Link } from "react-router-dom";
import {
  Users, CalendarDays, TrendingUp, CheckCircle2, Plus, ArrowUpRight, Video,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { StatCard } from "@/components/StatCard";
import { useStudents, useAllLessons } from "@/hooks/useData";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { students } = useStudents();
  const { lessons } = useAllLessons();
  const [progress, setProgress] = useState<{ month: string; avgScore: number }[]>([]);

  useEffect(() => {
    supabase.from("scores").select("month, speaking, grammar, year").then(({ data }) => {
      if (!data) return;
      const map = new Map<string, { sum: number; n: number }>();
      data.forEach((s: any) => {
        const key = s.month;
        const cur = map.get(key) ?? { sum: 0, n: 0 };
        cur.sum += (s.speaking + s.grammar) / 2;
        cur.n += 1;
        map.set(key, cur);
      });
      const order = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      setProgress(order.filter((m) => map.has(m)).map((m) => ({ month: m, avgScore: Math.round(map.get(m)!.sum / map.get(m)!.n) })));
    });
  }, []);

  const upcoming = lessons.filter((l) => l.attendance === "scheduled")
    .sort((a, b) => (a.lesson_date + a.lesson_time).localeCompare(b.lesson_date + b.lesson_time))
    .slice(0, 5);
  const completedCount = lessons.filter((l) => l.completed).length;
  const attended = lessons.filter((l) => l.attendance !== "scheduled");
  const attendanceRate = attended.length ? Math.round((attended.filter((l) => l.attendance === "present").length / attended.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none gradient-hero text-primary-foreground shadow-elevated">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <p className="text-sm font-medium opacity-90">Welcome back, Teacher</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
              {upcoming.length} upcoming lessons · {students.length} students
            </h2>
            <p className="mt-2 max-w-xl text-sm opacity-90">
              ARP Speak English With Me — every student's progress in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="rounded-full">
              <Link to="/students"><Plus className="mr-1 h-4 w-4" /> Add student</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground">
              <Link to="/lessons"><CalendarDays className="mr-1 h-4 w-4" /> Lessons</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total students" value={students.length} icon={Users} accent="primary" />
        <StatCard label="Lessons completed" value={completedCount} icon={CheckCircle2} accent="success" />
        <StatCard label="Attendance rate" value={`${attendanceRate}%`} icon={TrendingUp} accent="accent" />
        <StatCard label="Upcoming lessons" value={upcoming.length} icon={CalendarDays} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-elegant lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Monthly progress</CardTitle>
            <p className="text-xs text-muted-foreground">Average student score across all students</p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <AreaChart data={progress}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Area type="monotone" dataKey="avgScore" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
              {progress.length === 0 && <p className="pt-20 text-center text-sm text-muted-foreground">Add scores to see progress here</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Upcoming lessons</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/lessons">All <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <UserAvatar className="h-10 w-10" name={l.profiles.full_name} src={l.profiles.avatar_url} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.topic || "Lesson"}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.profiles.full_name} · {l.lesson_date} {l.lesson_time}</p>
                </div>
                {(l.zoom_link || l.teams_link) && <Badge variant="secondary" className="rounded-full"><Video className="mr-1 h-3 w-3" />Online</Badge>}
              </div>
            ))}
            {upcoming.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No upcoming lessons.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
