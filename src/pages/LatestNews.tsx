import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { toast } from "sonner";
import { Newspaper, Plus, ExternalLink, Pencil, ArrowUp, ArrowDown, Image as ImageIcon } from "lucide-react";

const CATEGORIES = [
  "General English News",
  "Business English",
  "Technology",
  "TOEIC Preparation",
  "IELTS Preparation",
  "Travel English",
  "Conversation Topics",
];

type NewsLink = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string;
  sort_order: number;
  image_url: string | null;
  notes: string | null;
};

const hostFor = (u: string) => { try { return new URL(u).hostname.replace("www.", ""); } catch { return u; } };
const faviconFor = (u: string) => { try { return `https://www.google.com/s2/favicons?domain=${new URL(u).hostname}&sz=128`; } catch { return null; } };

export default function LatestNews() {
  const { user, role } = useAuth();
  const canManage = role === "admin" || role === "teacher";
  const [items, setItems] = useState<NewsLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NewsLink | null>(null);
  const [form, setForm] = useState({ title: "", url: "", description: "", category: CATEGORIES[0], image_url: "", notes: "" });
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("news_links").select("*").order("category").order("sort_order");
    setItems((data as any as NewsLink[]) ?? []);
    setLoading(false);
  };

  const openNew = () => { setEditing(null); setForm({ title: "", url: "", description: "", category: CATEGORIES[0], image_url: "", notes: "" }); setOpen(true); };
  const openEdit = (n: NewsLink) => {
    setEditing(n);
    setForm({ title: n.title, url: n.url, description: n.description ?? "", category: n.category, image_url: n.image_url ?? "", notes: n.notes ?? "" });
    setOpen(true);
  };

  const uploadImage = async (file: File) => {
    const path = `news/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: data.publicUrl }));
    toast.success("Image uploaded");
  };

  const save = async () => {
    if (!form.title || !form.url) return toast.error("Title and URL required");
    const payload = {
      title: form.title, url: form.url, category: form.category,
      description: form.description || null,
      image_url: form.image_url || null,
      notes: form.notes || null,
    };
    if (editing) {
      const { error } = await supabase.from("news_links").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const nextOrder = (items.filter(i => i.category === form.category).at(-1)?.sort_order ?? 0) + 1;
      const { error } = await supabase.from("news_links").insert({ ...payload, sort_order: nextOrder, created_by: user!.id });
      if (error) return toast.error(error.message);
      toast.success("Added");
    }
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("news_links").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); load();
  };

  const move = async (n: NewsLink, dir: -1 | 1) => {
    const siblings = items.filter(i => i.category === n.category).sort((a, b) => a.sort_order - b.sort_order);
    const idx = siblings.findIndex(s => s.id === n.id);
    const swap = siblings[idx + dir];
    if (!swap) return;
    await supabase.from("news_links").update({ sort_order: swap.sort_order }).eq("id", n.id);
    await supabase.from("news_links").update({ sort_order: n.sort_order }).eq("id", swap.id);
    load();
  };

  const shown = filter === "all" ? items : items.filter(i => i.category === filter);
  const grouped: Record<string, NewsLink[]> = {};
  shown.forEach(i => { (grouped[i.category] ||= []).push(i); });

  return (
    <div className="space-y-4">
      <Card className="shadow-elegant">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Newspaper className="h-5 w-5" /> Latest News</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Recommended websites, articles and reading resources.</p>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {canManage && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add link</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <p>Loading…</p> : Object.keys(grouped).length === 0 ? (
            <p className="text-muted-foreground">No links yet.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, list]) => (
                <div key={cat}>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat}</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {list.map(n => {
                      const thumb = n.image_url || faviconFor(n.url);
                      return (
                        <div key={n.id} className="flex gap-3 rounded-lg border p-3 hover:bg-accent/50">
                          <a href={n.url} target="_blank" rel="noreferrer" className="shrink-0">
                            {thumb ? (
                              <img src={thumb} alt="" className="h-20 w-20 rounded-md border object-cover bg-muted" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <div className="grid h-20 w-20 place-items-center rounded-md border bg-muted"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
                            )}
                          </a>
                          <div className="min-w-0 flex-1">
                            <a href={n.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-medium hover:underline">
                              {n.title} <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                            </a>
                            {n.description && <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">{n.description}</p>}
                            {n.notes && <p className="mt-1 whitespace-pre-wrap rounded border-l-2 border-primary/40 bg-muted/40 px-2 py-1 text-xs text-foreground/80">{n.notes}</p>}
                            <Badge variant="outline" className="mt-1.5">{hostFor(n.url)}</Badge>
                          </div>
                          {canManage && (
                            <div className="flex flex-col gap-1">
                              <Button size="icon" variant="ghost" onClick={() => move(n, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => move(n, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => openEdit(n)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <ConfirmDeleteButton onConfirm={async () => { await remove(n.id); }} />
                            </div>
                          )}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit link" : "Add link"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>URL</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div>
              <Label>Thumbnail image</Label>
              <div className="flex gap-2">
                <Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://... or upload" />
                <Input type="file" accept="image/*" className="w-auto" onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
              </div>
              {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-24 rounded border object-cover" />}
              <p className="mt-1 text-xs text-muted-foreground">Leave empty to auto-use the site's favicon.</p>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={4} placeholder="Add context, discussion questions, vocabulary…" /></div>
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
