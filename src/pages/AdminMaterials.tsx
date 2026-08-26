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
import { BookOpen, Plus, Upload, Users, ExternalLink, FileText, Pencil, Copy, FolderPlus, FolderInput, Trash2, Folder } from "lucide-react";

const TYPES = ["pdf", "doc", "pptx", "image", "audio", "video", "link"];
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const SKILLS = ["listening", "reading", "speaking", "writing", "grammar", "vocabulary"];

const emptyForm = { title: "", description: "", type: "pdf", cefr_level: "", skill: "", external_url: "", objectives: "", lesson_plan: "", category_id: "", tags: "", thumbnail_url: "", thumbnail_fit: "cover" };

export default function AdminMaterials() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [assignFor, setAssignFor] = useState<any>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [bulkTarget, setBulkTarget] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [newFolder, setNewFolder] = useState("");


  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoading(true);
    const [{ data: mats }, { data: cats }, { data: roles }, { data: assigns }] = await Promise.all([
      supabase.from("materials").select("*").order("created_at", { ascending: false }),
      supabase.from("material_categories").select("*").order("name"),
      supabase.from("user_roles").select("user_id").eq("role", "student"),
      supabase.from("material_assignments").select("*"),
    ]);
    const studentIds = (roles ?? []).map((r: any) => r.user_id);
    const { data: profs } = studentIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", studentIds)
      : { data: [] as any[] };
    setMaterials(mats ?? []);
    setCategories(cats ?? []);
    setStudents(profs ?? []);
    setAssignments(assigns ?? []);
    setLoading(false);
  };

  const openNew = () => { setEditingId(null); setForm({ ...emptyForm }); setFile(null); setThumbFile(null); setOpen(true); };

  const uploadThumb = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setUploadingThumb(true);
    const path = `${user!.id}/material-thumb-${crypto.randomUUID()}-${f.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, f, { upsert: true });
    setUploadingThumb(false);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm((prev: any) => ({ ...prev, thumbnail_url: data.publicUrl }));
    toast.success("Background image uploaded");
  };
  const openEdit = (m: any) => {
    setEditingId(m.id);
    setForm({
      title: m.title ?? "", description: m.description ?? "", type: m.type ?? "pdf",
      cefr_level: m.cefr_level ?? "", skill: m.skill ?? "", external_url: m.external_url ?? "",
      objectives: m.objectives ?? "", lesson_plan: m.lesson_plan ?? "",
      category_id: m.category_id ?? "", tags: (m.tags ?? []).join(", "),
      thumbnail_url: m.thumbnail_url ?? "", thumbnail_fit: m.thumbnail_fit ?? "cover",
    });
    setFile(null);
    setOpen(true);
  };

  const saveMaterial = async () => {
    if (!form.title) return toast.error("Title required");
    const payload: any = {
      title: form.title,
      description: form.description || null,
      type: form.type,
      cefr_level: form.cefr_level || null,
      skill: form.skill || null,
      external_url: form.external_url || null,
      objectives: form.objectives || null,
      lesson_plan: form.lesson_plan || null,
      category_id: form.category_id || null,
      thumbnail_url: form.thumbnail_url || null,
      thumbnail_fit: form.thumbnail_fit || "cover",
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
    };
    if (editingId) {
      if (file && form.type !== "link") {
        const path = `${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from("materials").upload(path, file);
        if (error) return toast.error(error.message);
        payload.storage_path = path;
      }
      const { error } = await supabase.from("materials").update(payload).eq("id", editingId);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      if (file && form.type !== "link") {
        const path = `${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabase.storage.from("materials").upload(path, file);
        if (error) return toast.error(error.message);
        payload.storage_path = path;
      }
      payload.created_by = user!.id;
      const { error } = await supabase.from("materials").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Material added");
    }
    setOpen(false); setForm({ ...emptyForm }); setFile(null); setEditingId(null); load();
  };

  const duplicate = async (m: any) => {
    const { id, created_at, updated_at, ...rest } = m;
    const { error } = await supabase.from("materials").insert({ ...rest, title: `${m.title} (copy)`, created_by: user!.id });
    if (error) return toast.error(error.message);
    toast.success("Duplicated"); load();
  };

  const toggleSelect = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const bulkDelete = async () => {
    if (!selected.length) return;
    setBusy(true);
    const paths = materials.filter(m => selected.includes(m.id) && m.storage_path).map(m => m.storage_path);
    if (paths.length) await supabase.storage.from("materials").remove(paths);
    const { error } = await supabase.from("materials").delete().in("id", selected);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${selected.length} material(s) deleted`);
    setSelected([]); load();
  };

  const bulkMove = async () => {
    if (!selected.length || !bulkTarget) return;
    setBusy(true);
    const { error } = await supabase.from("materials")
      .update({ category_id: bulkTarget === "uncat" ? null : bulkTarget })
      .in("id", selected);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Moved ${selected.length} material(s)`);
    setSelected([]); setBulkTarget(""); load();
  };

  const createFolder = async () => {
    const name = newFolder.trim();
    if (!name) return;
    const { error } = await supabase.from("material_categories").insert({ name, kind: "folder" });
    if (error) return toast.error(error.message);
    setNewFolder(""); toast.success("Folder created"); load();
  };

  const renameFolder = async (c: any) => {
    const name = window.prompt("Folder name", c.name)?.trim();
    if (!name || name === c.name) return;
    const { error } = await supabase.from("material_categories").update({ name }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Folder renamed"); load();
  };

  const deleteFolder = async (c: any) => {
    await supabase.from("materials").update({ category_id: null }).eq("category_id", c.id);
    const { error } = await supabase.from("material_categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    if (folderFilter === c.id) setFolderFilter("all");
    toast.success("Folder deleted (materials moved to Uncategorized)"); load();
  };


  const deleteMaterial = async (m: any) => {
    if (m.storage_path) await supabase.storage.from("materials").remove([m.storage_path]);
    await supabase.from("materials").delete().eq("id", m.id);
    toast.success("Deleted"); load();
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
    toast.success("Assignments updated"); setAssignFor(null); load();
  };

  const openFile = async (m: any) => {
    if (m.external_url) return window.open(m.external_url, "_blank");
    if (!m.storage_path) return;
    const { data } = await supabase.storage.from("materials").createSignedUrl(m.storage_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const shown = folderFilter === "all"
    ? materials
    : folderFilter === "uncat" ? materials.filter(m => !m.category_id) : materials.filter(m => m.category_id === folderFilter);

  return (
    <div className="space-y-4">
      <Card className="shadow-elegant">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Learning materials</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFoldersOpen(true)}><FolderPlus className="mr-2 h-4 w-4" /> Manage folders</Button>

            <Select value={folderFilter} onValueChange={setFolderFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All folders</SelectItem>
                <SelectItem value="uncat">Uncategorized</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm({ ...emptyForm }); } }}>
              <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add material</Button></DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>{editingId ? "Edit material" : "New learning material"}</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                  <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Folder / Category</Label>
                      <Select value={form.category_id || "none"} onValueChange={v => setForm({ ...form, category_id: v === "none" ? "" : v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="none">Uncategorized</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                      </Select></div>
                    <div><Label>Type</Label>
                      <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
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
                  <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="beginner, business, unit1" /></div>
                  {form.type === "link" ? (
                    <div><Label>External URL</Label><Input value={form.external_url} onChange={e => setForm({ ...form, external_url: e.target.value })} placeholder="https://..." /></div>
                  ) : (
                    <div><Label>{editingId ? "Replace file (optional)" : "File"}</Label><Input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} /></div>
                  )}
                  <div>
                    <Label>Background image (thumbnail)</Label>
                    <div className="flex gap-2">
                      <Input value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://image-url..." />
                      {form.thumbnail_url && <Button type="button" variant="ghost" onClick={() => setForm({ ...form, thumbnail_url: "" })}>Clear</Button>}
                    </div>
                    <Input className="mt-2" type="file" accept="image/*" disabled={uploadingThumb}
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadThumb(f); }} />
                    <div className="mt-2">
                      <Label>Image fit</Label>
                      <Select value={form.thumbnail_fit} onValueChange={v => setForm({ ...form, thumbnail_fit: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cover">Fill card (crop edges)</SelectItem>
                          <SelectItem value="contain">Fit whole image (no crop)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {form.thumbnail_url && (
                      <div className="mt-2 flex h-24 w-full items-center justify-center overflow-hidden rounded-md bg-muted">
                        <img
                          src={form.thumbnail_url}
                          alt="Material background preview"
                          className={`h-full w-full ${form.thumbnail_fit === "contain" ? "object-contain" : "object-cover"}`}
                        />
                      </div>
                    )}
                  </div>
                  <div><Label>Learning objectives</Label><Textarea value={form.objectives} onChange={e => setForm({ ...form, objectives: e.target.value })} rows={2} /></div>
                  <div><Label>Lesson plan / notes</Label><Textarea value={form.lesson_plan} onChange={e => setForm({ ...form, lesson_plan: e.target.value })} rows={3} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={saveMaterial}><Upload className="mr-2 h-4 w-4" /> Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!loading && shown.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2">
              <label className="flex cursor-pointer items-center gap-2 px-1 text-sm">
                <input
                  type="checkbox"
                  checked={selected.length > 0 && shown.every(m => selected.includes(m.id))}
                  onChange={e => setSelected(e.target.checked ? shown.map(m => m.id) : [])}
                />
                Select all ({shown.length})
              </label>
              <span className="text-sm text-muted-foreground">{selected.length} selected</span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Select value={bulkTarget} onValueChange={setBulkTarget}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="Move to folder…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uncat">Uncategorized</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" disabled={!selected.length || !bulkTarget || busy} onClick={bulkMove}>
                  <FolderInput className="mr-1.5 h-4 w-4" /> Move
                </Button>
                <Button size="sm" variant="destructive" disabled={!selected.length || busy}
                  onClick={() => { if (window.confirm(`Delete ${selected.length} material(s)? This cannot be undone.`)) bulkDelete(); }}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete selected
                </Button>
              </div>
            </div>
          )}
          {loading ? <p>Loading…</p> : shown.length === 0 ? <p className="text-muted-foreground">No materials in this folder.</p> : (
            <div className="grid gap-3 md:grid-cols-2">
              {shown.map(m => {
                const count = assignments.filter(a => a.material_id === m.id).length;
                const cat = categories.find(c => c.id === m.category_id);
                const isSel = selected.includes(m.id);
                return (
                  <Card key={m.id} className={`overflow-hidden border-border/60 ${isSel ? "ring-2 ring-primary" : ""}`}>
                    {m.thumbnail_url && (
                      <div className="flex h-28 w-full items-center justify-center bg-muted">
                        <img
                          src={m.thumbnail_url}
                          alt={`${m.title} background`}
                          loading="lazy"
                          className={`h-full w-full ${m.thumbnail_fit === "contain" ? "object-contain" : "object-cover"}`}
                        />
                      </div>
                    )}
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex gap-2">
                          <input type="checkbox" className="mt-1.5" checked={isSel} onChange={() => toggleSelect(m.id)} aria-label={`Select ${m.title}`} />
                          <div className="min-w-0">
                          <h3 className="font-semibold break-words">{m.title}</h3>

                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <Badge variant="secondary">{m.type}</Badge>
                            {cat && <Badge variant="outline">{cat.name}</Badge>}
                            {m.cefr_level && <Badge variant="outline">{m.cefr_level}</Badge>}
                            {m.skill && <Badge variant="outline">{m.skill}</Badge>}
                            {(m.tags ?? []).map((t: string) => <Badge key={t} variant="outline" className="text-xs">#{t}</Badge>)}
                            <Badge className="bg-primary/10 text-primary" variant="outline">{count} assigned</Badge>
                          </div>
                          {m.description && <p className="mt-2 text-sm text-muted-foreground break-words">{m.description}</p>}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => duplicate(m)}><Copy className="h-3.5 w-3.5" /></Button>
                          <ConfirmDeleteButton onConfirm={() => deleteMaterial(m)} />
                        </div>
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

      <Dialog open={foldersOpen} onOpenChange={setFoldersOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage folders</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="New folder name (e.g. Adult English Courses)" value={newFolder}
                onChange={e => setNewFolder(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createFolder(); }} />
              <Button onClick={createFolder}><Plus className="mr-1.5 h-4 w-4" /> Create</Button>
            </div>
            <div className="divide-y rounded-md border">
              {categories.length === 0 && <p className="p-3 text-sm text-muted-foreground">No folders yet.</p>}
              {categories.map(c => (
                <div key={c.id} className="flex items-center gap-2 p-2">
                  <Folder className="h-4 w-4 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                  <span className="text-xs text-muted-foreground">{materials.filter(m => m.category_id === c.id).length} items</span>
                  <Button size="icon" variant="ghost" onClick={() => renameFolder(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <ConfirmDeleteButton onConfirm={async () => { await deleteFolder(c); }} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFoldersOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}
