import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudents } from "@/hooks/useData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarClock, Plus } from "lucide-react";
import { InstallmentSchedule, installmentState, type Plan, type Installment } from "@/components/InstallmentSchedule";

const today = () => new Date().toISOString().slice(0, 10);

export default function AdminInstallments() {
  const { students } = useStudents();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [insts, setInsts] = useState<Installment[]>([]);
  const [proofIds, setProofIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("all");
  const [enrol, setEnrol] = useState(false);
  const [form, setForm] = useState({ student: "", pkg: "10.10 Promotion — 110 lessons", total: "9500", count: "10", purchase: today(), first: today(), lessons: "110", instructions: "" });
  const [edit, setEdit] = useState<Installment | null>(null);
  const [ed, setEd] = useState({ status: "paid", paid_at: today(), ref: "", note: "" });

  const load = async () => {
    const [{ data: p }, { data: i }, { data: pay }] = await Promise.all([
      supabase.from("installment_plans").select("*").order("created_at", { ascending: false }),
      supabase.from("installments").select("*"),
      supabase.from("invoice_payments").select("invoice_id"),
    ]);
    setPlans((p as any) ?? []); setInsts((i as any) ?? []);
    setProofIds(new Set((pay ?? []).map((x: any) => x.invoice_id)));
  };
  useEffect(() => { load(); }, []);

  const name = (id: string) => students.find((s) => s.id === id)?.full_name ?? "Student";

  const create = async () => {
    if (!form.student) return toast.error("Choose a student");
    const { error } = await supabase.rpc("create_installment_plan", {
      _student: form.student, _package: form.pkg, _total: Number(form.total), _count: Number(form.count),
      _purchase: form.purchase, _first_due: form.first, _lessons: Number(form.lessons || 0), _instructions: form.instructions || null,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Instalment plan created with monthly invoices");
    setEnrol(false); load();
  };

  const save = async () => {
    if (!edit) return;
    const { error } = await supabase.rpc("set_installment_status", {
      _id: edit.id, _status: ed.status, _paid_at: ed.paid_at || null, _reference: ed.ref || null, _note: ed.note || null,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Instalment updated"); setEdit(null); load();
  };

  const visible = useMemo(() => plans.filter((p) => {
    const items = insts.filter((i) => i.plan_id === p.id);
    if (filter === "complete") return items.every((i) => i.status === "paid");
    if (filter === "overdue") return items.some((i) => installmentState(i, !!i.invoice_id && proofIds.has(i.invoice_id)) === "overdue");
    if (filter === "verify") return items.some((i) => i.status !== "paid" && i.invoice_id && proofIds.has(i.invoice_id));
    return true;
  }), [plans, insts, filter, proofIds]);

  const outstanding = insts.filter((i) => i.status !== "paid").reduce((s, i) => s + Number(i.amount), 0);
  const collected = insts.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="space-y-4">
      <Card className="shadow-elegant">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" /> Instalment plans</CardTitle>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                <SelectItem value="verify">Slip to verify</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="complete">Fully paid</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setEnrol(true)}><Plus className="mr-1 h-4 w-4" /> Enrol student</Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm">
          <div>Collected: <b>{collected.toLocaleString()} THB</b></div>
          <div>Outstanding: <b>{outstanding.toLocaleString()} THB</b></div>
          <div>Plans: <b>{plans.length}</b></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((p) => {
          const items = insts.filter((i) => i.plan_id === p.id).sort((a, b) => a.installment_number - b.installment_number);
          return (
            <div key={p.id} className="space-y-2">
              <p className="font-semibold">{name(p.student_id)}</p>
              <InstallmentSchedule plan={p} items={items} proofInvoiceIds={proofIds} />
              <div className="flex flex-wrap gap-1">
                {items.map((i) => (
                  <Badge key={i.id} variant={i.status === "paid" ? "default" : "outline"} className="cursor-pointer"
                    onClick={() => { setEdit(i); setEd({ status: i.status === "paid" ? "unpaid" : "paid", paid_at: i.paid_at ?? today(), ref: i.payment_reference ?? "", note: i.admin_notes ?? "" }); }}>
                    #{i.installment_number} {i.status === "paid" ? "✓" : "Mark…"}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
        {visible.length === 0 && <p className="text-sm text-muted-foreground">No instalment plans.</p>}
      </div>

      <Dialog open={enrol} onOpenChange={setEnrol}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enrol in instalment plan</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Student</Label>
              <Select value={form.student} onValueChange={(v) => setForm({ ...form, student: v })}>
                <SelectTrigger><SelectValue placeholder="Choose student" /></SelectTrigger>
                <SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Package name</Label><Input value={form.pkg} onChange={(e) => setForm({ ...form, pkg: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Total (THB)</Label><Input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: e.target.value })} /></div>
              <div><Label>Instalments</Label><Input type="number" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} /></div>
              <div><Label>Lessons to add</Label><Input type="number" value={form.lessons} onChange={(e) => setForm({ ...form, lessons: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Purchase date</Label><Input type="date" value={form.purchase} onChange={(e) => setForm({ ...form, purchase: e.target.value })} /></div>
              <div><Label>First payment due</Label><Input type="date" value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} /></div>
            </div>
            <div><Label>Payment instructions (bank / PromptPay)</Label><Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Creates one invoice per month and adds the lessons to the student's balance (unused lessons carry forward).</p>
          </div>
          <DialogFooter><Button onClick={create}>Create plan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Instalment #{edit?.installment_number}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Status</Label>
              <Select value={ed.status} onValueChange={(v) => setEd({ ...ed, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="paid">Paid (received)</SelectItem><SelectItem value="unpaid">Unpaid</SelectItem></SelectContent>
              </Select>
            </div>
            {ed.status === "paid" && <div><Label>Payment date</Label><Input type="date" value={ed.paid_at} onChange={(e) => setEd({ ...ed, paid_at: e.target.value })} /></div>}
            <div><Label>Payment reference</Label><Input value={ed.ref} onChange={(e) => setEd({ ...ed, ref: e.target.value })} /></div>
            <div><Label>Note</Label><Input value={ed.note} onChange={(e) => setEd({ ...ed, note: e.target.value })} /></div>
            <p className="text-xs text-muted-foreground">Every change is logged. Payment slips are in Invoices.</p>
          </div>
          <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
