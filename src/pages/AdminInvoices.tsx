import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { formatLessonsLeft } from "@/lib/lessons";
import { Receipt, Plus, Upload, Download, DollarSign, CheckCircle2, RefreshCw } from "lucide-react";

const STATUSES = ["pending", "partial", "paid", "overdue", "cancelled"];

export default function AdminInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStudent, setFilterStudent] = useState("all");
  const [file, setFile] = useState<File | null>(null);
  const [payFor, setPayFor] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [resetBalance, setResetBalance] = useState(true);
  const [payMethod, setPayMethod] = useState("");
  const [form, setForm] = useState<any>({
    student_id: "", package_name: "", lessons_count: 10, lesson_duration_min: 60,
    subtotal: 0, discount: 0, tax: 0, total: 0, currency: "THB", status: "pending",
    issue_date: new Date().toISOString().slice(0, 10), due_date: "", notes: "",
  });

  useEffect(() => { if (user) load(); }, [user]);

  useEffect(() => {
    setForm((f: any) => ({ ...f, total: Number(f.subtotal || 0) - Number(f.discount || 0) + Number(f.tax || 0) }));
  }, [form.subtotal, form.discount, form.tax]);

  const load = async () => {
    setLoading(true);
    const [{ data: inv }, { data: roles }, { data: pays }] = await Promise.all([
      supabase.from("invoices").select("*").order("issue_date", { ascending: false }),
      supabase.from("user_roles").select("user_id").eq("role", "student"),
      supabase.from("invoice_payments").select("*"),
    ]);
    const ids = (roles ?? []).map((r: any) => r.user_id);
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] as any[] };
    setInvoices(inv ?? []);
    setStudents(profs ?? []);
    setPayments(pays ?? []);
    setLoading(false);
  };

  const createInvoice = async () => {
    if (!form.student_id) return toast.error("Select a student");
    let pdf_path = null;
    if (file) {
      const path = `${form.student_id}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("invoices").upload(path, file);
      if (error) return toast.error(error.message);
      pdf_path = path;
    }
    const { error } = await supabase.from("invoices").insert({
      ...form, pdf_path, due_date: form.due_date || null, created_by: user!.id,
    });
    if (error) return toast.error(error.message);

    if (resetBalance && Number(form.lessons_count) > 0) {
      const { error: pErr } = await supabase.from("profiles").update({
        lessons_purchased: Number(form.lessons_count),
        lessons_reset_at: form.issue_date,
        course_start_date: form.issue_date,
      }).eq("id", form.student_id);
      if (pErr) toast.error(`Invoice saved, but balance reset failed: ${pErr.message}`);
      else toast.success(`Invoice created — balance reset to ${formatLessonsLeft(Number(form.lessons_count))}`);
    } else {
      toast.success("Invoice created");
    }
    setOpen(false);
    setFile(null);
    load();
  };

  const applyBalance = async (inv: any) => {
    const count = Number(inv.lessons_count) || 0;
    if (!count) return;
    const { error } = await supabase.from("profiles").update({
      lessons_purchased: count,
      lessons_reset_at: inv.issue_date,
      course_start_date: inv.issue_date,
    }).eq("id", inv.student_id);
    if (error) return toast.error(error.message);
    toast.success(`${nameOf(inv.student_id)} now has ${formatLessonsLeft(count)}`);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("invoices").update({ status }).eq("id", id);
    toast.success("Updated");
    load();
  };

  const remove = async (inv: any) => {
    if (inv.pdf_path) await supabase.storage.from("invoices").remove([inv.pdf_path]);
    await supabase.from("invoices").delete().eq("id", inv.id);
    toast.success("Deleted");
    load();
  };

  const downloadPdf = async (path: string) => {
    const { data } = await supabase.storage.from("invoices").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const recordPayment = async () => {
    if (!payFor || !payAmount) return;
    const amt = Number(payAmount);
    await supabase.from("invoice_payments").insert({
      invoice_id: payFor.id, amount: amt, method: payMethod, uploaded_by: user!.id,
    });
    const totalPaid = payments.filter(p => p.invoice_id === payFor.id).reduce((s, p) => s + Number(p.amount), 0) + amt;
    const newStatus = totalPaid >= Number(payFor.total) ? "paid" : "partial";
    await supabase.from("invoices").update({ status: newStatus }).eq("id", payFor.id);
    toast.success("Payment recorded");
    setPayFor(null); setPayAmount(""); setPayMethod("");
    load();
  };

  const filtered = invoices.filter(i =>
    (filterStatus === "all" || i.status === filterStatus) &&
    (filterStudent === "all" || i.student_id === filterStudent));
  const summary = useMemo(() => ({
    total: filtered.reduce((s, i) => s + Number(i.total), 0),
    paid: filtered.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total), 0),
    pending: filtered.filter(i => i.status === "pending" || i.status === "partial").reduce((s, i) => s + Number(i.total), 0),
  }), [filtered]);
  const nameOf = (id: string) => students.find(s => s.id === id)?.full_name ?? "—";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Total invoiced</div><div className="text-2xl font-bold">{summary.total.toLocaleString()} THB</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Collected</div><div className="text-2xl font-bold text-green-600">{summary.paid.toLocaleString()} THB</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-2xl font-bold text-orange-600">{summary.pending.toLocaleString()} THB</div></CardContent></Card>
      </div>

      <Card className="shadow-elegant">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Invoices</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filterStudent} onValueChange={setFilterStudent}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All students</SelectItem>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> New invoice</Button></DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Create invoice</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Student</Label>
                    <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Issue date</Label><Input type="date" value={form.issue_date} onChange={e => setForm({ ...form, issue_date: e.target.value })} /></div>
                    <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
                  </div>
                  <div><Label>Package name</Label><Input value={form.package_name} onChange={e => setForm({ ...form, package_name: e.target.value })} placeholder="e.g. 20 lessons private" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Lessons</Label><Input type="number" value={form.lessons_count} onChange={e => setForm({ ...form, lessons_count: +e.target.value })} /></div>
                    <div><Label>Duration (min)</Label><Input type="number" value={form.lesson_duration_min} onChange={e => setForm({ ...form, lesson_duration_min: +e.target.value })} /></div>
                  </div>
                  <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                    <Checkbox checked={resetBalance} onCheckedChange={(v) => setResetBalance(!!v)} className="mt-0.5" />
                    <span>
                      Reset lesson balance to this package
                      <span className="block text-xs text-muted-foreground">
                        Replaces any previous balance — student will show “{formatLessonsLeft(Number(form.lessons_count) || 0)}”. Uncheck to keep the current balance.
                      </span>
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div><Label>Subtotal</Label><Input type="number" value={form.subtotal} onChange={e => setForm({ ...form, subtotal: +e.target.value })} /></div>
                    <div><Label>Discount</Label><Input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: +e.target.value })} /></div>
                    <div><Label>Tax</Label><Input type="number" value={form.tax} onChange={e => setForm({ ...form, tax: +e.target.value })} /></div>
                  </div>
                  <div className="rounded bg-muted p-2 text-sm">Total: <b>{form.total} {form.currency}</b></div>
                  <div><Label>Status</Label>
                    <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                  <div><Label>Upload PDF (optional)</Label><Input type="file" accept="application/pdf,image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={createInvoice}>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading…</p> : filtered.length === 0 ? <p className="text-muted-foreground">No invoices.</p> : (
            <div className="space-y-2">
              {filtered.map(i => {
                const paidSum = payments.filter(p => p.invoice_id === i.id).reduce((s, p) => s + Number(p.amount), 0);
                return (
                  <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                    <div>
                      <div className="font-semibold">{i.invoice_number} · {nameOf(i.student_id)}</div>
                      <div className="text-xs text-muted-foreground">{i.package_name} · {i.issue_date}{i.due_date ? ` → due ${i.due_date}` : ""}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{Number(i.total).toLocaleString()} {i.currency}</div>
                      <div className="text-xs text-muted-foreground">Paid: {paidSum.toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={i.status} onValueChange={(v) => updateStatus(i.id, v)}>
                        <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      {Number(i.lessons_count) > 0 && (
                        <Button size="sm" variant="outline" title={`Reset balance to ${formatLessonsLeft(Number(i.lessons_count))}`} onClick={() => applyBalance(i)}>
                          <RefreshCw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => { setPayFor(i); setPayAmount(String(Number(i.total) - paidSum)); }}>
                        <DollarSign className="h-3.5 w-3.5" />
                      </Button>
                      {i.pdf_path && <Button size="sm" variant="ghost" onClick={() => downloadPdf(i.pdf_path)}><Download className="h-3.5 w-3.5" /></Button>}
                      <ConfirmDeleteButton onConfirm={() => remove(i)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record payment · {payFor?.invoice_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Amount</Label><Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} /></div>
            <div><Label>Method</Label><Input value={payMethod} onChange={e => setPayMethod(e.target.value)} placeholder="bank transfer, cash…" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayFor(null)}>Cancel</Button>
            <Button onClick={recordPayment}><CheckCircle2 className="mr-2 h-4 w-4" /> Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
