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
import { Newspaper, Plus, ExternalLink, Pencil, ArrowUp, ArrowDown } from "lucide-react";

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
};

export default function LatestNews() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [items, setItems] = useState<NewsLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NewsLink | null>(null);
  const [form, setForm] = useState({ title: "", url: "", description: "", category: CATEGORIES[0] });
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("news_links").select("*").order("category").order("sort_order");
    setItems((data as NewsLink[]) ?? []);
    setLoading(false);
  };

  const openNew = () => { setEditing(null); setForm({ title: "", url: "", description: "", category: CATEGORIES[0] }); setOpen(true); };
  const openEdit = (n: NewsLink) => { setEditing(n); setForm({ title: n.title, url: n.url, description: n.description ?? "", category: n.category }); setOpen(true); };

  const save = async () => {
    if (!form.title || !form.url) return toast.error("Title and URL required");
    if (editing) {
      const { error } = await supabase.from("news_links").update({ ...form, description: form.description || null }).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Updated");
    } else {
      const nextOrder = (items.filter(i => i.category === form.category).at(-1)?.sort_order ?? 0) + 1;
      const { error } = await supabase.from("news_links").insert({ ...form, description: form.description || null, sort_order: nextOrder, created_by: user!.id });
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
            <p className="mt-1 text-sm text-muted-foreground">Recommended websites and reading resources.</p>
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {isAdmin && <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Add link</Button>}
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
                  <div className="grid gap-2 md:grid-cols-2">
                    {list.map(n => (
                      <div key={n.id} className="flex items-start justify-between gap-2 rounded-lg border p-3 hover:bg-accent/50">
                        <a href={n.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-medium">
                            {n.title} <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          {n.description && <p className="mt-0.5 text-sm text-muted-foreground">{n.description}</p>}
                          <Badge variant="outline" className="mt-1.5">{new URL(n.url).hostname.replace("www.", "")}</Badge>
                        </a>
                        {isAdmin && (
                          <div className="flex flex-col gap-1">
                            <Button size="icon" variant="ghost" onClick={() => move(n, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => move(n, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" onClick={() => openEdit(n)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <ConfirmDeleteButton onConfirm={() => remove(n.id)} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit link" : "Add link"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>URL</Label><Input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
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
