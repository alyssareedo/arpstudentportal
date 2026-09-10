import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { toast } from "sonner";
import { Video as VideoIcon, Plus, ExternalLink, Pencil, Play } from "lucide-react";

const CATEGORIES = [
  "My Teaching Videos",
  "English Tips",
  "Pronunciation",
  "Grammar",
  "Vocabulary",
  "Listening Practice",
  "Business English",
  "Exam Preparation",
];

type VideoLink = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
};

const youtubeId = (u: string) => {
  const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m?.[1] ?? null;
};
const embedFor = (u: string) => {
  const yt = youtubeId(u);
  if (yt) return `https://www.youtube.com/embed/${yt}`;
  const vimeo = u.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
};
const thumbFor = (v: VideoLink) => {
  if (v.thumbnail_url) return v.thumbnail_url;
  const yt = youtubeId(v.url);
  return yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : null;
};
const hostFor = (u: string) => { try { return new URL(u).hostname.replace("www.", ""); } catch { return u; } };

const emptyForm = { title: "", url: "", description: "", category: CATEGORIES[0], thumbnail_url: "", notes: "", is_active: true };

export default function Videos() {
  const { user, role } = useAuth();
  const canManage = role === "admin" || role === "teacher";
  const [items, setItems] = useState<VideoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<VideoLink | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("all");
  const [playing, setPlaying] = useState<VideoLink | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("video_links" as any).select("*").order("category").order("sort_order");
    if (error) toast.error(error.message);
    setItems((data as any as VideoLink[]) ?? []);
    setLoading(false);
  };

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (v: VideoLink) => {
    setEditing(v);
    setForm({
      title: v.title, url: v.url, description: v.description ?? "", category: v.category,
      thumbnail_url: v.thumbnail_url ?? "", notes: v.notes ?? "", is_active: v.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.url.trim()) return toast.error("Title and video link are required");
    const payload = {
      title: form.title.trim(),
      url: form.url.trim(),
      category: form.category,
      description: form.description || null,
      thumbnail_url: form.thumbnail_url || null,
      notes: form.notes || null,
      is_active: form.is_active,
    };
    if (editing) {
      const { error } = await supabase.from("video_links" as any).update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Video updated");
    } else {
      const nextOrder = (items.filter(i => i.category === form.category).at(-1)?.sort_order ?? 0) + 1;
      const { error } = await supabase.from("video_links" as any).insert({ ...payload, sort_order: nextOrder, created_by: user!.id });
      if (error) return toast.error(error.message);
      toast.success("Video added");
    }
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("video_links" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const shown = filter === "all" ? items : items.filter(i => i.category === filter);
  const grouped: Record<string, VideoLink[]> = {};
  shown.forEach(i => { (grouped[i.category] ||= []).push(i); });

  return (
    <div className="space-y-4">
      <Card className="shadow-elegant">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><VideoIcon className="h-5 w-5" /> Videos</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Teaching videos and English tips to watch any time.</p>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {canManage && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add video</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading…</p> : Object.keys(grouped).length === 0 ? (
            <p className="text-muted-foreground">No videos yet.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, list]) => (
                <div key={cat}>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat}</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map(v => {
                      const thumb = thumbFor(v);
                      const canEmbed = !!embedFor(v.url);
                      return (
                        <div key={v.id} className="overflow-hidden rounded-lg border transition hover:shadow-elegant">
                          <button
                            type="button"
                            className="relative block w-full bg-muted"
                            onClick={() => canEmbed ? setPlaying(v) : window.open(v.url, "_blank", "noreferrer")}
                          >
                            {thumb ? (
                              <img src={thumb} alt={v.title} loading="lazy" className="h-40 w-full object-contain bg-muted" />
                            ) : (
                              <div className="grid h-40 w-full place-items-center"><VideoIcon className="h-8 w-8 text-muted-foreground" /></div>
                            )}
                            <span className="absolute inset-0 grid place-items-center">
                              <span className="rounded-full bg-background/80 p-3 shadow"><Play className="h-5 w-5" /></span>
                            </span>
                          </button>
                          <div className="space-y-1.5 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium leading-snug">{v.title}</p>
                              {canManage && !v.is_active && <Badge variant="secondary">Hidden</Badge>}
                            </div>
                            {v.description && <p className="text-sm text-muted-foreground line-clamp-2">{v.description}</p>}
                            {v.notes && <p className="whitespace-pre-wrap rounded border-l-2 border-primary/40 bg-muted/40 px-2 py-1 text-xs text-foreground/80">{v.notes}</p>}
                            <div className="flex items-center justify-between pt-1">
                              <a href={v.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:underline">
                                {hostFor(v.url)} <ExternalLink className="h-3 w-3" />
                              </a>
                              {canManage && (
                                <div className="flex gap-1">
                                  <Button size="icon" variant="ghost" onClick={() => openEdit(v)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <ConfirmDeleteButton onConfirm={async () => { await remove(v.id); }} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!playing} onOpenChange={o => !o && setPlaying(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{playing?.title}</DialogTitle></DialogHeader>
          {playing && embedFor(playing.url) && (
            <div className="aspect-video w-full overflow-hidden rounded-md">
              <iframe
                src={embedFor(playing.url)!}
                title={playing.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {playing?.notes && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{playing.notes}</p>}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit video" : "Add video"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div>
              <Label>Video link</Label>
              <Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
              <p className="mt-1 text-xs text-muted-foreground">YouTube and Vimeo links play inside the app; other links open in a new tab.</p>
            </div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div>
              <Label>Thumbnail image (optional)</Label>
              <Input value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} placeholder="https://..." />
              {form.thumbnail_url && <img src={form.thumbnail_url} alt="" className="mt-2 h-24 rounded border object-contain" />}
            </div>
            <div><Label>Notes for students</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="video-active">Visible to students</Label>
              <Switch id="video-active" checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
