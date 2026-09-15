import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface TestResult {
  id: string;
  student_id: string;
  test_name: string;
  provider: string | null;
  test_date: string;
  score: number | null;
  max_score: number | null;
  cefr_level: string | null;
  notes: string | null;
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function StudentTestResults({ studentId, canEdit }: { studentId: string; canEdit: boolean }) {
  const [rows, setRows] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("student_test_results")
      .select("*")
      .eq("student_id", studentId)
      .order("test_date", { ascending: false });
    setRows((data as TestResult[]) ?? []);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  return (
    <Card className="border-border/60 shadow-elegant">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Test marks (CEFR & other tests)</CardTitle>
        {canEdit && <TestResultDialog studentId={studentId} onSaved={load} />}
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No test marks recorded yet.</p>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border/60 p-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {r.test_name}
                  {r.cefr_level && <Badge variant="secondary" className="rounded-full">{r.cefr_level}</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.test_date}{r.provider ? ` · ${r.provider}` : ""}
                </p>
                {r.notes && <p className="mt-1 text-sm text-muted-foreground">{r.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                {r.score !== null && (
                  <span className="text-lg font-bold text-primary">
                    {r.score}{r.max_score !== null ? ` / ${r.max_score}` : ""}
                  </span>
                )}
                {canEdit && <TestResultDialog studentId={studentId} existing={r} onSaved={load} />}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function TestResultDialog({ studentId, existing, onSaved }: { studentId: string; existing?: TestResult; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    test_name: existing?.test_name ?? "",
    provider: existing?.provider ?? "",
    test_date: existing?.test_date ?? new Date().toISOString().slice(0, 10),
    score: existing?.score != null ? String(existing.score) : "",
    max_score: existing?.max_score != null ? String(existing.max_score) : "",
    cefr_level: existing?.cefr_level ?? "none",
    notes: existing?.notes ?? "",
  });

  const save = async () => {
    if (!form.test_name.trim()) return toast.error("Test name is required");
    setBusy(true);
    const payload = {
      student_id: studentId,
      test_name: form.test_name.trim(),
      provider: form.provider.trim() || null,
      test_date: form.test_date,
      score: form.score === "" ? null : Number(form.score),
      max_score: form.max_score === "" ? null : Number(form.max_score),
      cefr_level: form.cefr_level === "none" ? null : form.cefr_level,
      notes: form.notes.trim() || null,
    };
    const { error } = existing
      ? await supabase.from("student_test_results").update(payload).eq("id", existing.id)
      : await supabase.from("student_test_results").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(existing ? "Test mark updated" : "Test mark added");
    setOpen(false);
    onSaved();
  };

  const remove = async () => {
    if (!existing) return;
    if (!confirm("Delete this test mark?")) return;
    setBusy(true);
    const { error } = await supabase.from("student_test_results").delete().eq("id", existing.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Test mark deleted");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {existing ? (
          <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
        ) : (
          <Button size="sm" variant="outline" className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Add mark</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{existing ? "Edit test mark" : "Add test mark"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2"><Label>Test name</Label>
            <Input value={form.test_name} placeholder="Abridge Academy placement test" onChange={(e) => setForm({ ...form, test_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2"><Label>Provider / website</Label><Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Date</Label><Input type="date" value={form.test_date} onChange={(e) => setForm({ ...form, test_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="grid gap-2"><Label>Score</Label><Input type="number" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} /></div>
            <div className="grid gap-2"><Label>Out of</Label><Input type="number" value={form.max_score} onChange={(e) => setForm({ ...form, max_score: e.target.value })} /></div>
            <div className="grid gap-2"><Label>CEFR level</Label>
              <Select value={form.cefr_level} onValueChange={(v) => setForm({ ...form, cefr_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2"><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          {existing ? <Button variant="destructive" onClick={remove} disabled={busy}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button> : <span />}
          <Button onClick={save} disabled={busy} className="gradient-primary text-primary-foreground"><Save className="mr-1 h-4 w-4" /> Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
