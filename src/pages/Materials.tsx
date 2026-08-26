import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { toast } from "sonner";
import {
  BookOpen, Star, StarOff, CheckCircle2, ExternalLink, Search,
  Folder, FileText, FileImage, FileVideo, FileAudio, Link2, Presentation, Download, ChevronLeft, LayoutGrid, List, Pencil,
} from "lucide-react";

const typeIcon = (t: string) => {
  const cls = "h-4 w-4";
  switch (t) {
    case "pdf": return <FileText className={cls + " text-red-500"} />;
    case "doc": return <FileText className={cls + " text-blue-500"} />;
    case "pptx": return <Presentation className={cls + " text-orange-500"} />;
    case "image": return <FileImage className={cls + " text-purple-500"} />;
    case "video": return <FileVideo className={cls + " text-pink-500"} />;
    case "audio": return <FileAudio className={cls + " text-emerald-500"} />;
    case "link": return <Link2 className={cls + " text-sky-500"} />;
    default: return <FileText className={cls} />;
  }
};

type Sort = "name" | "date" | "cefr" | "category" | "status";

export default function Materials() {
  const { user, role } = useAuth();
  const canManage = role === "admin" || role === "teacher";

  const [materials, setMaterials] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "assigned" | "favorites" | "completed">("all");
  const [folder, setFolder] = useState<string | null>(null); // null = root
  const [sort, setSort] = useState<Sort>("date");
  const [view, setView] = useState<"grid" | "list">("grid");

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoading(true);
    const [{ data: mats }, { data: cats }, { data: assigns }, { data: prog }] = await Promise.all([
      supabase.from("materials").select("*").order("created_at", { ascending: false }),
      supabase.from("material_categories").select("*").order("name"),
      supabase.from("material_assignments").select("*").eq("student_id", user!.id),
      supabase.from("material_progress").select("*").eq("student_id", user!.id),
    ]);
    setMaterials(mats ?? []);
    setCategories(cats ?? []);
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

  const download = async (m: any) => {
    if (m.external_url) return window.open(m.external_url, "_blank");
    if (!m.storage_path) return;
    const { data } = await supabase.storage.from("materials").createSignedUrl(m.storage_path, 3600, { download: true });
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const [renameOpen, setRenameOpen] = useState(false);
  const [renaming, setRenaming] = useState<any>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const openRename = (m: any) => { setRenaming(m); setRenameTitle(m.title); setRenameOpen(true); };
  const saveRename = async () => {
    if (!renaming || !renameTitle.trim()) return;
    const { error } = await supabase.from("materials").update({ title: renameTitle.trim() }).eq("id", renaming.id);
    if (error) return toast.error(error.message);
    toast.success("Renamed"); setRenameOpen(false); load();
  };

  const deleteMaterial = async (m: any) => {
    if (m.storage_path) await supabase.storage.from("materials").remove([m.storage_path]);
    const { error } = await supabase.from("materials").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };


  const assignedIds = useMemo(() => new Set(assignments.map(a => a.material_id)), [assignments]);

  const enriched = useMemo(() => materials.map(m => ({
    ...m,
    prog: progress[m.id],
    isAssigned: assignedIds.has(m.id),
    categoryName: categories.find(c => c.id === m.category_id)?.name ?? null,
  })), [materials, progress, assignedIds, categories]);

  const searched = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return enriched;
    return enriched.filter(m =>
      (m.title + " " + (m.description || "") + " " + (m.tags ?? []).join(" ")).toLowerCase().includes(q)
    );
  }, [enriched, search]);

  const tabbed = useMemo(() => {
    switch (tab) {
      case "assigned": return searched.filter(m => m.isAssigned);
      case "favorites": return searched.filter(m => m.prog?.favorited);
      case "completed": return searched.filter(m => m.prog?.status === "completed");
      default: return searched;
    }
  }, [searched, tab]);

  const folderScoped = folder === null
    ? tabbed
    : folder === "uncat"
      ? tabbed.filter(m => !m.category_id)
      : tabbed.filter(m => m.category_id === folder);

  const sorted = useMemo(() => {
    const arr = [...folderScoped];
    switch (sort) {
      case "name": arr.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "cefr": arr.sort((a, b) => (a.cefr_level ?? "z").localeCompare(b.cefr_level ?? "z")); break;
      case "category": arr.sort((a, b) => (a.categoryName ?? "z").localeCompare(b.categoryName ?? "z")); break;
      case "status": arr.sort((a, b) => (b.prog?.status === "completed" ? 1 : 0) - (a.prog?.status === "completed" ? 1 : 0)); break;
      default: arr.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
    }
    return arr;
  }, [folderScoped, sort]);

  const totalAssigned = enriched.filter(m => m.isAssigned).length;
  const doneAssigned = enriched.filter(m => m.isAssigned && m.prog?.status === "completed").length;
  const pct = totalAssigned ? Math.round((doneAssigned / totalAssigned) * 100) : 0;

  // Folder counts for the root view
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tabbed.forEach(m => {
      const key = m.category_id ?? "uncat";
      counts[key] = (counts[key] ?? 0) + 1;
    });
    return counts;
  }, [tabbed]);

  const currentFolderName = folder === null ? null : folder === "uncat" ? "Uncategorized" : categories.find(c => c.id === folder)?.name ?? "Folder";

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Learning materials
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date added</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="cefr">CEFR level</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="status">Completion</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex overflow-hidden rounded-md border">
              <Button size="icon" variant={view === "grid" ? "secondary" : "ghost"} className="rounded-none" onClick={() => setView("grid")}><LayoutGrid className="h-4 w-4" /></Button>
              <Button size="icon" variant={view === "list" ? "secondary" : "ghost"} className="rounded-none" onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Assigned progress</span><span>{doneAssigned}/{totalAssigned} · {pct}%</span>
          </div>
          <Progress value={pct} />
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search materials, tags, description..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-3">
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="assigned">Assigned</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          {folder !== null && (
            <Button size="sm" variant="ghost" onClick={() => setFolder(null)}><ChevronLeft className="mr-1 h-4 w-4" /> All folders</Button>
          )}
          <span className="font-medium text-foreground">{currentFolderName ?? "Folders"}</span>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? <p>Loading…</p> : (
          <div className="space-y-6">
            {folder === null && (
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Folders</h3>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {categories.map(c => (
                    <button key={c.id} onClick={() => setFolder(c.id)}
                      className="flex items-center gap-3 rounded-lg border p-4 text-left hover:bg-accent transition">
                      <Folder className="h-8 w-8 text-primary" />
                      <div className="min-w-0">
                        <div className="truncate font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{folderCounts[c.id] ?? 0} items</div>
                      </div>
                    </button>
                  ))}
                  <button onClick={() => setFolder("uncat")}
                    className="flex items-center gap-3 rounded-lg border p-4 text-left hover:bg-accent transition">
                    <Folder className="h-8 w-8 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="truncate font-medium">Uncategorized</div>
                      <div className="text-xs text-muted-foreground">{folderCounts["uncat"] ?? 0} items</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {(folder !== null || search.trim()) && (
            <div>
              {folder === null && (
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Search results ({sorted.length})</h3>
              )}
              {sorted.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing here yet.</p>
              ) : view === "grid" ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sorted.map(m => {
                    const done = m.prog?.status === "completed";
                    return (
                      <div key={m.id} className={`overflow-hidden rounded-lg border ${done ? "border-green-500/40 bg-green-500/5" : ""}`}>
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
                        <div className="flex items-start gap-2 p-3 pb-0">
                          <div className="mt-0.5">{typeIcon(m.type)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium break-words">{m.title}</div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <Badge variant="secondary" className="text-xs">{m.type}</Badge>
                              {m.cefr_level && <Badge variant="outline" className="text-xs">{m.cefr_level}</Badge>}
                              {m.skill && <Badge variant="outline" className="text-xs">{m.skill}</Badge>}
                              {m.isAssigned && <Badge className="bg-primary/10 text-primary text-xs" variant="outline">Assigned</Badge>}
                            </div>
                            {m.description && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{m.description}</p>}
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => upsertProgress(m.id, { favorited: !m.prog?.favorited })}>
                            {m.prog?.favorited ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5 p-3 pt-0">
                          <Button size="sm" variant="outline" onClick={() => openMaterial(m)}>
                            {m.type === "link" ? <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />} Open
                          </Button>
                          {m.storage_path && <Button size="sm" variant="ghost" onClick={() => download(m)}><Download className="h-3.5 w-3.5" /></Button>}
                          <Button size="sm" variant={done ? "secondary" : "default"}
                            onClick={() => upsertProgress(m.id, { status: done ? "in_progress" : "completed", completed_at: done ? null : new Date().toISOString() })}>
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> {done ? "Undo" : "Complete"}
                          </Button>
                          {canManage && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => openRename(m)}><Pencil className="mr-1 h-3.5 w-3.5" /> Rename</Button>
                              <ConfirmDeleteButton onConfirm={async () => { await deleteMaterial(m); }} />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="divide-y rounded-lg border">
                  {sorted.map(m => {
                    const done = m.prog?.status === "completed";
                    return (
                      <div key={m.id} className="flex items-center gap-3 p-3 hover:bg-accent/40">
                        {typeIcon(m.type)}
                        <button onClick={() => openMaterial(m)} className="min-w-0 flex-1 text-left">
                          <div className="truncate font-medium">{m.title}</div>
                          <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                            <span>{m.type}</span>
                            {m.cefr_level && <span>· {m.cefr_level}</span>}
                            {m.categoryName && <span>· {m.categoryName}</span>}
                            {m.isAssigned && <span>· Assigned</span>}
                          </div>
                        </button>
                        <Button size="icon" variant="ghost" onClick={() => upsertProgress(m.id, { favorited: !m.prog?.favorited })}>
                          {m.prog?.favorited ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="h-4 w-4" />}
                        </Button>
                        {m.storage_path && <Button size="icon" variant="ghost" onClick={() => download(m)}><Download className="h-4 w-4" /></Button>}
                        <Button size="sm" variant={done ? "secondary" : "default"}
                          onClick={() => upsertProgress(m.id, { status: done ? "in_progress" : "completed", completed_at: done ? null : new Date().toISOString() })}>
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> {done ? "Undo" : "Complete"}
                        </Button>
                        {canManage && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => openRename(m)}><Pencil className="h-4 w-4" /></Button>
                            <ConfirmDeleteButton onConfirm={async () => { await deleteMaterial(m); }} />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename material</DialogTitle></DialogHeader>
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={renameTitle} onChange={e => setRenameTitle(e.target.value)} autoFocus />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={saveRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

