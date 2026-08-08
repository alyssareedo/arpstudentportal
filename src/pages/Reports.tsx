import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStudents, useStudent } from "@/hooks/useData";
import logo from "@/assets/logo.png";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Reports() {
  const { students } = useStudents();
  const [studentId, setStudentId] = useState<string>("");
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);

  useEffect(() => {
    if (!studentId && students.length) setStudentId(students[0].id);
  }, [students, studentId]);

  const { profile, lessons, scores } = useStudent(studentId);

  const stats = useMemo(() => {
    const taken = lessons.filter((l) => l.attendance !== "scheduled");
    const present = taken.filter((l) => l.attendance === "present").length;
    const late = taken.filter((l) => l.attendance === "late").length;
    const absent = taken.filter((l) => l.attendance === "absent").length;
    const rate = taken.length ? Math.round((present / taken.length) * 100) : 100;
    return { taken: taken.length, present, late, absent, rate };
  }, [lessons]);

  const pieData = [
    { name: "Present", value: stats.present, color: "hsl(var(--success))" },
    { name: "Late", value: stats.late, color: "hsl(var(--warning))" },
    { name: "Absent", value: stats.absent, color: "hsl(var(--destructive))" },
  ].filter((d) => d.value > 0);

  if (!profile) return <p className="text-center text-muted-foreground">{students.length === 0 ? "Add students first to generate reports." : "Loading…"}</p>;

  const latest = scores[scores.length - 1];

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-elegant">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="text-sm font-medium">Generate monthly report</p>
            <p className="text-xs text-muted-foreground">Select a student and month</p>
          </div>
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> Print</Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-elevated print:shadow-none">
        <CardHeader className="border-b bg-gradient-to-r from-secondary/60 to-background">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <img src={logo} alt="ARP Speak English With Me" className="h-16 w-auto" />
              <UserAvatar className="h-14 w-14 ring-2 ring-primary/20" name={profile.full_name} src={profile.avatar_url} />
              <div>
                <CardTitle className="text-xl">{profile.full_name}</CardTitle>
                <p className="text-sm text-muted-foreground">{month} progress report · Level {profile.level}</p>
              </div>
            </div>
            <Badge variant="secondary" className="rounded-full">Generated {new Date().toLocaleDateString()}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { l: "Attendance", v: `${stats.rate}%` },
              { l: "Lessons completed", v: stats.taken },
              { l: "Speaking", v: latest?.speaking ?? "-" },
              { l: "Grammar", v: latest?.grammar ?? "-" },
            ].map((k) => (
              <div key={k.l} className="rounded-xl border border-border/60 bg-secondary/40 p-4">
                <p className="text-xs text-muted-foreground">{k.l}</p>
                <p className="mt-1 text-2xl font-bold">{k.v}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-3 text-sm font-medium">Monthly scores</p>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={scores}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="speaking" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="grammar" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-border/60 p-4">
              <p className="mb-3 text-sm font-medium">Attendance breakdown</p>
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={4}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Lessons</p>
            <div className="overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="p-3">Date</th><th className="p-3">Topic</th><th className="p-3">Attendance</th></tr>
                </thead>
                <tbody>
                  {lessons.map((l) => (
                    <tr key={l.id} className="border-t border-border/60">
                      <td className="p-3 text-muted-foreground">{l.lesson_date}</td>
                      <td className="p-3 font-medium">{l.topic}</td>
                      <td className="p-3 capitalize">{l.attendance}</td>
                    </tr>
                  ))}
                  {lessons.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No lessons.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
