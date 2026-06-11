import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";

type Student = { id: string; full_name: string; email: string };
type Enrollment = {
  id: string;
  student_id: string;
  package_name: string;
  lessons_total: number;
  lessons_used: number;
  amount_paid: number;
  currency: string;
  starts_at: string;
  expires_at: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export default function Renewals() {
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    package_name: "Standard 10-lesson pack",
    lessons_total: 10,
    amount_paid: 5000,
    currency: "THB",
    starts_at: new Date().toISOString().slice(0, 10),
    expires_at: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
    const ids = (roles ?? []).map((r: any) => r.user_id);
    const [{ data: profs }, { data: enr }] = await Promise.all([
      ids.length ? supabase.from("profiles").select("id, full_name, email").in("id", ids).order("full_name") : Promise.resolve({ data: [] as any }),
      (supabase.from as any)("course_enrollments").select("*").order("created_at", { ascending: false }),
    ]);
    setStudents((profs as Student[]) ?? []);
    setEnrollments((enr as Enrollment[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!selectedStudent) return toast.error("Pick a student");
    setSaving(true);
    const payload = {
      student_id: selectedStudent,
      package_name: form.package_name,
      lessons_total: Number(form.lessons_total) || 0,
      lessons_used: 0,
      amount_paid: Number(form.amount_paid) || 0,
      currency: form.currency,
      starts_at: form.starts_at,
      expires_at: form.expires_at || null,
      status: "active",
      notes: form.notes || null,
    };
    const { error } = await (supabase.from as any)("course_enrollments").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Package added");
    setOpen(false);
    load();
  }

  const studentName = (id: string) => students.find((s) => s.id === id)?.full_name ?? "Unknown";

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Course Renewals</h1>
          <p className="text-sm text-muted-foreground">Add new lesson packages to existing students without creating a new account.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add package</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Renew or add a package</DialogTitle>
              <DialogDescription>The student keeps all history (lessons, tests, homework). Lesson balance adds on top.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label>Student</Label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name} — {s.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Package name</Label><Input value={form.package_name} onChange={(e) => setForm({ ...form, package_name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Lessons</Label><Input type="number" value={form.lessons_total} onChange={(e) => setForm({ ...form, lessons_total: +e.target.value })} /></div>
                <div className="grid gap-2"><Label>Amount</Label><Input type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: +e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label>Start date</Label><Input type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Expires</Label><Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
              </div>
              <div className="grid gap-2"><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save package"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All enrollments</CardTitle>
          <CardDescription>Most recent first. Renewals are stacked so previous history stays intact.</CardDescription>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No enrollments yet. Add the first package above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Lessons</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((e) => {
                  const remaining = e.lessons_total - e.lessons_used;
                  const expired = e.expires_at && new Date(e.expires_at) < new Date();
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{studentName(e.student_id)}</TableCell>
                      <TableCell>{e.package_name}</TableCell>
                      <TableCell>{remaining}/{e.lessons_total}</TableCell>
                      <TableCell>{e.currency} {e.amount_paid.toLocaleString()}</TableCell>
                      <TableCell>{format(new Date(e.starts_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>{e.expires_at ? format(new Date(e.expires_at), "MMM d, yyyy") : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={expired ? "destructive" : remaining === 0 ? "secondary" : "default"}>
                          {expired ? "expired" : remaining === 0 ? "used up" : e.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
