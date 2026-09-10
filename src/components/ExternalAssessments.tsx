import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { toast } from "sonner";
import { ExternalLink, Plus, Pencil, Link2 } from "lucide-react";

interface LinkRow {
  id: string;
  title: string;
  url: string;
  description: string | null;
  provider: string | null;
  audience: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const empty = {
  title: "",
  url: "",
  description: "",
  provider: "",
  audience: "all",
  image_url: "",
  sort_order: 0,
  is_active: true,
};

export function ExternalAssessments() {
  const { role, user } = useAuth();
  const isAdmin = role === "admin";
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LinkRow | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("assessment_links")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) toast.error("Could not load test links");
    setRows((data as LinkRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startNew() {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  }

  function startEdit(r: LinkRow) {
    setEditing(r);
    setForm({
      title: r.title,
      url: r.url,
      description: r.description ?? "",
      provider: r.provider ?? "",
      audience: r.audience,
      image_url: r.image_url ?? "",
      sort_order: r.sort_order,
      is_active: r.is_active,
    });
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim() || !form.url.trim()) {
      toast.error("Title and link are required");
      return;
    }
    let url = form.url.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      url,
      description: form.description.trim() || null,
      provider: form.provider.trim() || null,
      audience: form.audience,
      image_url: form.image_url.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: form.is_active,
    };
    const { error } = editing
      ? await supabase.from("assessment_links").update(payload).eq("id", editing.id)
      : await supabase.from("assessment_links").insert({ ...payload, created_by: user?.id ?? null });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(editing ? "Link updated" : "Link added");
    setOpen(false);
    load();
  }

  const visible = isAdmin ? rows : rows.filter((r) => r.is_active);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Other tests
          </CardTitle>
          <CardDescription>Useful tests from other websites.</CardDescription>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={startNew}>
                <Plus className="mr-2 h-4 w-4" /> Add link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit test link" : "Add test link"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Kids Placement Test" />
                </div>
                <div className="space-y-1">
                  <Label>Link *</Label>
                  <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
                </div>
                <div className="space-y-1">
                  <Label>Website / provider</Label>
                  <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="Abridge Academy" />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Image URL</Label>
                    <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Order</Label>
                    <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Visible to students</Label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No other tests added yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visible.map((r) => (
              <div key={r.id} className="flex gap-3 rounded-lg border p-3">
                {r.image_url && (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted">
                    <img src={r.image_url} alt={r.title} loading="lazy" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate font-medium hover:underline"
                    >
                      {r.title}
                    </a>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {!r.is_active && <Badge variant="outline">Hidden</Badge>}
                  </div>
                  {r.provider && <div className="text-xs text-muted-foreground">{r.provider}</div>}
                  {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                  {isAdmin && (
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <ConfirmDeleteButton
                        title="Delete this link?"
                        description="Students will no longer see this test."
                        onConfirm={async () => {
                          const { error } = await supabase.from("assessment_links").delete().eq("id", r.id);
                          if (error) throw error;
                          toast.success("Link deleted");
                          load();
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
