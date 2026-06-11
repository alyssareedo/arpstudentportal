import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, X, Plus } from "lucide-react";

type Person = { id: string; full_name: string; email: string };
type Assignment = { id: string; teacher_id: string; student_id: string };

export default function Teachers() {
  const [teachers, setTeachers] = useState<Person[]>([]);
  const [students, setStudents] = useState<Person[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selTeacher, setSelTeacher] = useState("");
  const [selStudent, setSelStudent] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["teacher", "student"]);
    const tIds = (roles ?? []).filter((r: any) => r.role === "teacher").map((r: any) => r.user_id);
    const sIds = (roles ?? []).filter((r: any) => r.role === "student").map((r: any) => r.user_id);
    const allIds = [...tIds, ...sIds];
    const [{ data: profs }, { data: ass }] = await Promise.all([
      allIds.length ? supabase.from("profiles").select("id, full_name, email").in("id", allIds) : Promise.resolve({ data: [] as any }),
      (supabase.from as any)("teacher_assignments").select("*"),
    ]);
    const all = (profs as Person[]) ?? [];
    setTeachers(all.filter((p) => tIds.includes(p.id)).sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setStudents(all.filter((p) => sIds.includes(p.id)).sort((a, b) => a.full_name.localeCompare(b.full_name)));
    setAssignments((ass as Assignment[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function assign() {
    if (!selTeacher || !selStudent) return toast.error("Pick a teacher and a student");
    const { error } = await (supabase.from as any)("teacher_assignments").insert({ teacher_id: selTeacher, student_id: selStudent });
    if (error) return toast.error(error.message);
    toast.success("Assigned");
    setSelStudent("");
    load();
  }
  async function remove(id: string) {
    const { error } = await (supabase.from as any)("teacher_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name ?? "Unknown";
  const teacherName = (id: string) => teachers.find((t) => t.id === id)?.full_name ?? "Unknown";

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teachers</h1>
        <p className="text-sm text-muted-foreground">Assign students to teachers. Teachers will only see their assigned students.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Assign student to teacher</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-muted-foreground">Teacher</label>
            <Select value={selTeacher} onValueChange={setSelTeacher}>
              <SelectTrigger className="w-60"><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-medium text-muted-foreground">Student</label>
            <Select value={selStudent} onValueChange={setSelStudent}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={assign}><Plus className="mr-2 h-4 w-4" /> Assign</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teachers</CardTitle>
          <CardDescription>{teachers.length} teacher{teachers.length === 1 ? "" : "s"} · {assignments.length} assignment{assignments.length === 1 ? "" : "s"}</CardDescription>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No teachers yet. Create accounts and set their role to "teacher" from Students or Settings.</p>
          ) : (
            <div className="space-y-6">
              {teachers.map((t) => {
                const mine = assignments.filter((a) => a.teacher_id === t.id);
                return (
                  <div key={t.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="font-semibold">{t.full_name}</h3>
                      <Badge variant="secondary">{mine.length} student{mine.length === 1 ? "" : "s"}</Badge>
                    </div>
                    {mine.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No students assigned.</p>
                    ) : (
                      <Table>
                        <TableHeader><TableRow><TableHead>Student</TableHead><TableHead className="w-24"></TableHead></TableRow></TableHeader>
                        <TableBody>
                          {mine.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell>{studentName(a.student_id)}</TableCell>
                              <TableCell><Button size="sm" variant="ghost" onClick={() => remove(a.id)}><X className="h-4 w-4" /></Button></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
