import { Link } from "react-router-dom";
import {
  Users,
  CalendarDays,
  TrendingUp,
  CheckCircle2,
  Plus,
  ArrowUpRight,
  Video,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatCard } from "@/components/StatCard";
import {
  attendanceTrend,
  lessons,
  monthlyProgress,
  students,
} from "@/data/mockData";

export default function Dashboard() {
  const upcoming = lessons
    .filter((l) => l.attendance === "scheduled")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 5);

  const completedCount = lessons.filter((l) => l.completed).length;
  const presentCount = lessons.filter((l) => l.attendance === "present").length;
  const attendanceRate = Math.round(
    (presentCount / lessons.filter((l) => l.attendance !== "scheduled").length) * 100
  );

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden border-none gradient-hero text-primary-foreground shadow-elevated">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <p className="text-sm font-medium opacity-90">Good morning, Teacher</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
              You have {upcoming.length} lessons coming up today and this week.
            </h2>
            <p className="mt-2 max-w-xl text-sm opacity-90">
              Stay on top of every student's progress. Add new lessons, review attendance
              and share student pages — all in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="rounded-full">
              <Link to="/students">
                <Plus className="mr-1 h-4 w-4" /> Add student
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground">
              <Link to="/lessons">
                <CalendarDays className="mr-1 h-4 w-4" /> Schedule lesson
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total students" value={students.length} icon={Users} trend="+2 this month" trendUp accent="primary" />
        <StatCard label="Lessons completed" value={completedCount} icon={CheckCircle2} trend="+8 vs last month" trendUp accent="success" />
        <StatCard label="Attendance rate" value={`${attendanceRate}%`} icon={TrendingUp} trend="Healthy" trendUp accent="accent" />
        <StatCard label="Upcoming lessons" value={upcoming.length} icon={CalendarDays} trend="Next 7 days" accent="warning" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-elegant lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base font-semibold">Monthly progress</CardTitle>
              <p className="text-xs text-muted-foreground">Average student score</p>
            </div>
            <Badge variant="secondary" className="rounded-full">+18 pts YTD</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <AreaChart data={monthlyProgress}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgScore"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#g1)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-elegant">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Attendance</CardTitle>
            <p className="text-xs text-muted-foreground">Last 4 weeks</p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                  />
                  <Bar dataKey="present" stackId="a" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="absent" stackId="a" fill="hsl(var(--destructive) / 0.7)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming & Recent students */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/60 shadow-elegant lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Upcoming lessons</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/lessons">View all <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((l) => {
              const student = students.find((s) => s.id === l.studentId)!;
              return (
                <div
                  key={l.id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition-colors hover:bg-secondary/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.avatarUrl} />
                    <AvatarFallback>{student.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.topic}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {student.name} · {l.date} at {l.time}
                    </p>
                  </div>
                  {(l.zoomLink || l.teamsLink) && (
                    <Badge variant="secondary" className="rounded-full">
                      <Video className="mr-1 h-3 w-3" />
                      {l.zoomLink ? "Zoom" : "Teams"}
                    </Badge>
                  )}
                </div>
              );
            })}
            {upcoming.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No upcoming lessons. Time for a break ☕
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Recent students</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/students">All <ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {students.slice(0, 5).map((s) => (
              <Link
                key={s.id}
                to={`/students/${s.id}`}
                className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-secondary/60"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={s.avatarUrl} />
                  <AvatarFallback>{s.name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                </div>
                <Badge variant="outline" className="rounded-full text-xs">{s.level}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
