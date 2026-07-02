import { useEffect, useState } from "react";
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
import { BookOpen, Plus, Upload, Users, ExternalLink, FileText } from "lucide-react";

const TYPES = ["pdf", "doc", "pptx", "image", "audio", "video", "link"];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SKILLS = ["listening", "reading", "speaking", "writing", "grammar", "vocabulary"];

export default function AdminMaterials() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<any>({ title: "", description: "", type: "pdf", cefr_level: "", skill: "", external_url: "", objectives: "", lesson_plan: "" });
  const [assignFor, setAssignFor] = useState<any>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoading(true);
    const [{ data: mats }, { data: roles }, { data: assigns }] = await Promise.all([
      supabase.from("materials").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id").eq("role", "student"),
      supabase.from("material_assignments").select("*"),
    ]);
    const studentIds = (roles ?? []).map((r: any) => r.user_id);
    const { data: profs } = studentIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
      : { data: [] as any[] };
    setMaterials(mats ?? []);
    setStudents(profs ?? []);
    setAssignments(assigns ?? []);
    setLoading(false);
  };

  const createMaterial = async () => {
    if (!form.title) return toast.error("Title required");
    let storage_path = null;
    if (file && form.type !== "link") {
      const path = `${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("materials").upload(path, file);
      if (error) return toast.error(error.message);
      storage_path = path;
    }
    const { error } = await supabase.from("materials").insert({
      ...form,
      storage_path,
      cefr_level: form.cefr_level || null,
      skill: form.skill || null,
      external_url: form.external_url || null,
      created_by: user!.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Material added");
    setOpen(false);
    setForm({ title: "", description: "", type: "pdf", cefr_level: "", skill: "", external_url: "", objectives: "", lesson_plan: "" });
    setFile(null);
    load();
  };

  const deleteMaterial = async (m: any) => {
    if (m.storage_path) await supabase.storage.from("materials").remove([m.storage_path]);
    await supabase.from("materials").delete().eq("id", m.id);
    toast.success("Deleted");
    load();
  };

  const openAssign = (m: any) => {
    setAssignFor(m);
    setSelectedStudents(assignments.filter(a => a.material_id === m.id).map(a => a.student_id));
    setDueDate("");
  };

  const saveAssign = async () => {
    if (!assignFor) return;
    const current = assignments.filter(a => a.material_id === assignFor.id).map(a => a.student_id);
    const toAdd = selectedStudents.filter(id => !current.includes(id));
    const toRemove = current.filter(id => !selectedStudents.includes(id));
    if (toAdd.length) {
      await supabase.from("material_assignments").insert(toAdd.map(sid => ({
        material_id: assignFor.id, student_id: sid, assigned_by: user!.id, due_date: dueDate || null,
      })));
    }
    if (toRemove.length) {
      await supabase.from("material_assignments").delete().eq("material_id", assignFor.id).in("student_id", toRemove);
    }
    toast.success("Assignments updated");
    setAssignFor(null);
    load();
  };

  const openFile = async (m: any) => {
    if (m.external_url) return window.open(m.external_url, "_blank");
    if (!m.storage_path) return;
    const { data } = await supabase.storage.from("materials").createSignedUrl(m.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-elegant">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Learning materials</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add material</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New learning material</DialogTitle></DialogHeader>
              <div className="grid gap-3">
                <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Type</Label>
                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label>CEFR</Label>
                    <Select value={form.cefr_level || "none"} onValueChange={v => setForm({ ...form, cefr_level: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Any</SelectItem>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label>Skill</Label>
                    <Select value={form.skill || "none"} onValueChange={v => setForm({ ...form, skill: v === "none" ? "" : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Any</SelectItem>{SKILLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select></div>
                </div>
                {form.type === "link" ? (
                  <div><Label>External URL</Label><Input value={form.external_url} onChange={e => setForm({ ...form, external_url: e.target.value })} placeholder="https://..." /></div>
                ) : (
                  <div><Label>File</Label><Input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} /></div>
                )}
                <div><Label>Learning objectives</Label><Textarea value={form.objectives} onChange={e => setForm({ ...form, objectives: e.target.value })} rows={2} /></div>
                <div><Label>Lesson plan / notes</Label><Textarea value={form.lesson_plan} onChange={e => setForm({ ...form, lesson_plan: e.target.value })} rows={3} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={createMaterial}><Upload className="mr-2 h-4 w-4" /> Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading…</p> : materials.length === 0 ? <p className="text-muted-foreground">No materials yet.</p> : (
            <div className="grid gap-3 md:grid-cols-2">
              {materials.map(m => {
                const count = assignments.filter(a => a.material_id === m.id).length;
                return (
                  <Card key={m.id} className="border-border/60">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{m.title}</h3>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <Badge variant="secondary">{m.type}</Badge>
                            {m.cefr_level && <Badge variant="outline">{m.cefr_level}</Badge>}
                            {m.skill && <Badge variant="outline">{m.skill}</Badge>}
                            <Badge className="bg-primary/10 text-primary" variant="outline">{count} assigned</Badge>
                          </div>
                          {m.description && <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>}
                        </div>
                        <ConfirmDeleteButton onConfirm={() => deleteMaterial(m)} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openFile(m)}>
                          {m.type === "link" ? <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />}
                          Open
                        </Button>
                        <Button size="sm" onClick={() => openAssign(m)}><Users className="mr-1.5 h-3.5 w-3.5" /> Assign</Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Assign "{assignFor?.title}"</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Due date (optional)</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            <div>
              <Label>Students</Label>
              <div className="mt-2 max-h-72 overflow-y-auto space-y-1 rounded border p-2">
                {students.map(s => (
                  <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                    <input type="checkbox" checked={selectedStudents.includes(s.id)}
                      onChange={e => setSelectedStudents(prev => e.target.checked ? [...prev, s.id] : prev.filter(x => x !== s.id))} />
                    <span className="text-sm">{s.full_name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button onClick={saveAssign}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
