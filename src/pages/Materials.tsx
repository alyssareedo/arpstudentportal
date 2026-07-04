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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { toast } from "sonner";
import { BookOpen, Star, StarOff, CheckCircle2, ExternalLink, FileText, Plus, Upload, Search } from "lucide-react";

const TYPES = ["pdf", "doc", "pptx", "image", "audio", "video", "link"];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SKILLS = ["listening", "reading", "speaking", "writing", "grammar", "vocabulary"];

export default function Materials() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<any>({ title: "", description: "", type: "link", cefr_level: "", skill: "", external_url: "" });

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoading(true);
    const [{ data: mats }, { data: assigns }, { data: prog }] = await Promise.all([
      supabase.from("materials").select("*").order("created_at", { ascending: false }),
      supabase.from("material_assignments").select("*").eq("student_id", user!.id),
      supabase.from("material_progress").select("*").eq("student_id", user!.id),
    ]);
    setMaterials(mats ?? []);
    setAssignments(assigns ?? []);
    setProgress(Object.fromEntries((prog ?? []).map((p: any) => [p.material_id, p])));
    setLoading(false);
  };

  const upsertProgress = async (material_id: string, patch: any) => {
    const existing = progress[material_id];
    if (existing) await supabase.from("material_progress").update(patch).eq("id", existing.id);
    else await supabase.from("material_progress").insert({ material_id, student_id: user!.id, ...patch });
    load();
  };

  const openMaterial = async (m: any) => {
    if (m.external_url) window.open(m.external_url, "_blank");
    else if (m.storage_path) {
      const { data } = await supabase.storage.from("materials").createSignedUrl(m.storage_path, 3600);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
      else toast.error("Could not open file");
    }
    if (!progress[m.id]?.completed_at) upsertProgress(m.id, { status: "in_progress" });
  };

  const createMaterial = async () => {
    if (!form.title) return toast.error("Title required");
    let storage_path: string | null = null;
    if (file && form.type !== "link") {
      const path = `${user!.id}/${crypto.randomUUID()}-${file.name}`;
      const { error } = await supabase.storage.from("materials").upload(path, file);
      if (error) return toast.error(error.message);
      storage_path = path;
    }
    const { error } = await supabase.from("materials").insert({
      title: form.title,
      description: form.description || null,
      type: form.type,
      cefr_level: form.cefr_level || null,
      skill: form.skill || null,
      external_url: form.external_url || null,
      storage_path,
      created_by: user!.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Material added");
    setOpen(false);
    setForm({ title: "", description: "", type: "link", cefr_level: "", skill: "", external_url: "" });
    setFile(null);
    load();
  };

  const deleteMaterial = async (m: any) => {
    if (m.storage_path) await supabase.storage.from("materials").remove([m.storage_path]);
    const { error } = await supabase.from("materials").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const assignedIds = new Set(assignments.map(a => a.material_id));
  const enriched = materials.map(m => ({
    ...m,
    assignment: assignments.find(a => a.material_id === m.id),
    prog: progress[m.id],
    isAssigned: assignedIds.has(m.id),
  }));
  const filtered = search
    ? enriched.filter(m => (m.title + " " + (m.description || "")).toLowerCase().includes(search.toLowerCase()))
    : enriched;
  const assignedList = filtered.filter(m => m.isAssigned);
  const favorites = filtered.filter(m => m.prog?.favorited);
  const completed = filtered.filter(m => m.prog?.status === "completed");
  const mine = filtered.filter(m => m.created_by === user?.id);
  const totalAssigned = enriched.filter(m => m.isAssigned).length;
  const doneAssigned = enriched.filter(m => m.isAssigned && m.prog?.status === "completed").length;
  const pct = totalAssigned ? Math.round((doneAssigned / totalAssigned) * 100) : 0;

  const renderCard = (m: any) => {
    const done = m.prog?.status === "completed";
    const owner = m.created_by === user?.id;
    return (
      <Card key={m.id} className={done ? "border-green-500/40" : ""}>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold break-words">{m.title}</h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <Badge variant="secondary">{m.type}</Badge>
                {m.cefr_level && <Badge variant="outline">{m.cefr_level}</Badge>}
                {m.skill && <Badge variant="outline">{m.skill}</Badge>}
                {m.isAssigned && <Badge className="bg-primary/10 text-primary" variant="outline">Assigned</Badge>}
                {m.assignment?.due_date && <Badge variant="outline">Due {m.assignment.due_date}</Badge>}
              </div>
              {m.description && <p className="mt-2 text-sm text-muted-foreground break-words">{m.description}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="icon" onClick={() => upsertProgress(m.id, { favorited: !m.prog?.favorited })}>
                {m.prog?.favorited ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="h-4 w-4" />}
              </Button>
              {owner && <ConfirmDeleteButton onConfirm={() => deleteMaterial(m)} />}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => openMaterial(m)}>
              {m.type === "link" ? <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />} Open
            </Button>
            <Button size="sm" variant={done ? "secondary" : "default"}
              onClick={() => { upsertProgress(m.id, { status: done ? "in_progress" : "completed", completed_at: done ? null : new Date().toISOString() }); }}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> {done ? "Mark incomplete" : "Mark complete"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderList = (list: any[]) => list.length === 0
    ? <p className="text-muted-foreground text-sm">Nothing here yet.</p>
    : <div className="grid gap-3 md:grid-cols-2">{list.map(renderCard)}</div>;

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Learning materials</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Upload material</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Upload learning material</DialogTitle></DialogHeader>
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={createMaterial}><Upload className="mr-2 h-4 w-4" /> Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Assigned progress</span><span>{doneAssigned}/{totalAssigned} · {pct}%</span>
          </div>
          <Progress value={pct} />
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search materials..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p>Loading…</p> : (
          <Tabs defaultValue="all">
            <TabsList className="flex-wrap">
              <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
              <TabsTrigger value="assigned">Assigned ({assignedList.length})</TabsTrigger>
              <TabsTrigger value="favorites">Favorites ({favorites.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
              <TabsTrigger value="mine">My uploads ({mine.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-3">{renderList(filtered)}</TabsContent>
            <TabsContent value="assigned" className="mt-3">{renderList(assignedList)}</TabsContent>
            <TabsContent value="favorites" className="mt-3">{renderList(favorites)}</TabsContent>
            <TabsContent value="completed" className="mt-3">{renderList(completed)}</TabsContent>
            <TabsContent value="mine" className="mt-3">{renderList(mine)}</TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
