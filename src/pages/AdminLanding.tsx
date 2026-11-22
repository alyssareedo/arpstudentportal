import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";
import Landing from "./Landing";
import { defaultLanding, useLandingContent, publishLanding } from "@/lib/siteContent";

export default function AdminLanding() {
  const [c, setC] = useLandingContent();
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<{ id: string; full_name: string }[]>([]);
  const [reads, setReads] = useState<Record<string, Record<string, string>>>({});
  useEffect(() => {
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
      const sids = (roles ?? []).map((r) => r.user_id);
      if (sids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", sids).order("full_name");
        setStudents(profs ?? []);
      }
      const { data: r } = await supabase.from("announcement_reads").select("announcement_id, student_id, read_at");
      const map: Record<string, Record<string, string>> = {};
      (r ?? []).forEach((x) => { (map[x.announcement_id] ??= {})[x.student_id] = x.read_at; });
      setReads(map);
    })();
  }, []);

  const upload = async (file: File, field: "photo_url" | "logo_url" = "photo_url") => {
    const path = `landing/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setC({ ...c, [field]: data.publicUrl });
    toast.success("Uploaded — click Save to publish");
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("landing_content").upsert({ id: 1, content: c, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) return toast.error(error.message);
    publishLanding(c);
    toast.success("Saved");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Edit home page</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div><Label>Headline</Label><Input value={c.headline} onChange={e => setC({ ...c, headline: e.target.value })} /></div>
          <div><Label>Intro text</Label><Textarea value={c.subtitle} onChange={e => setC({ ...c, subtitle: e.target.value })} /></div>
          {c.bullets.map((b, i) => (
            <div key={i}><Label>Point {i + 1}</Label><Input value={b} onChange={e => { const bl = [...c.bullets]; bl[i] = e.target.value; setC({ ...c, bullets: bl }); }} /></div>
          ))}
          <div><Label>Bottom banner heading</Label><Input value={c.cta_heading} onChange={e => setC({ ...c, cta_heading: e.target.value })} /></div>
          <div className="flex flex-wrap items-end gap-3">
            <div><Label>Photo</Label><Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} /></div>
            {c.photo_url && <Button variant="outline" onClick={() => setC({ ...c, photo_url: "" })}>Use default photo</Button>}
          </div>
          <div className="flex items-center gap-3"><Switch checked={c.show_prices} onCheckedChange={v => setC({ ...c, show_prices: v })} /><Label>Show lesson prices on the home page</Label></div>
          {c.show_prices && <div><Label>Prices heading</Label><Input value={c.prices_heading} onChange={e => setC({ ...c, prices_heading: e.target.value })} /><p className="mt-1 text-xs text-muted-foreground">Prices come from the Pricing page — add, edit or hide packages there.</p></div>}
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button variant="ghost" onClick={() => setC({ ...c, headline: defaultLanding.headline, subtitle: defaultLanding.subtitle, bullets: defaultLanding.bullets, cta_heading: defaultLanding.cta_heading })}>Reset to default text</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>School name, logo & colour</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div><Label>School name</Label><Input value={c.school_name} onChange={e => setC({ ...c, school_name: e.target.value })} /></div>
          <div className="flex flex-wrap items-end gap-3">
            <div><Label>Logo</Label><Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && upload(e.target.files[0], "logo_url")} /></div>
            {c.logo_url && <><img src={c.logo_url} alt="" className="h-10 w-auto" /><Button variant="outline" onClick={() => setC({ ...c, logo_url: "" })}>Use default logo</Button></>}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div><Label>Main colour</Label><Input type="color" className="h-10 w-20 p-1" value={c.brand_color || "#0E3181"} onChange={e => setC({ ...c, brand_color: e.target.value })} /></div>
            {c.brand_color && <Button variant="outline" onClick={() => setC({ ...c, brand_color: "" })}>Use default colour</Button>}
          </div>
          <div><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Student portal welcome</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">Shown at the top of every student's profile page. Leave empty to hide.</p>
          <div><Label>Title</Label><Input value={c.welcome_title} onChange={e => setC({ ...c, welcome_title: e.target.value })} /></div>
          <div><Label>Message & tips</Label><Textarea rows={4} value={c.welcome_text} onChange={e => setC({ ...c, welcome_text: e.target.value })} /></div>
          <div><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-sm text-muted-foreground">All students see these on their profile page, newest first.</p>
          {c.announcements.map((a, i) => {
            const set = (patch: Partial<typeof a>) => { const list = [...c.announcements]; list[i] = { ...a, ...patch }; setC({ ...c, announcements: list }); };
            return (
              <div key={a.id} className="grid gap-2 rounded-lg border p-3">
                <div className="flex gap-2">
                  <Input placeholder="Title" value={a.title} onChange={e => set({ title: e.target.value })} />
                  <Input type="date" className="w-44" value={a.date} onChange={e => set({ date: e.target.value })} />
                  <Button variant="ghost" size="icon" aria-label="Remove announcement" onClick={() => setC({ ...c, announcements: c.announcements.filter(x => x.id !== a.id) })}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <Textarea placeholder="Message" value={a.body} onChange={e => set({ body: e.target.value })} />
                {(() => {
                  const seen = reads[a.id] ?? {};
                  const seenList = students.filter(s => seen[s.id]);
                  const notSeen = students.filter(s => !seen[s.id]);
                  return (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground">Seen by {seenList.length} of {students.length} students</summary>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="font-medium">Seen</p>
                          {seenList.length ? seenList.map(s => <p key={s.id}>{s.full_name} <span className="text-xs text-muted-foreground">· {new Date(seen[s.id]).toLocaleString()}</span></p>) : <p className="text-muted-foreground">No one yet</p>}
                        </div>
                        <div>
                          <p className="font-medium">Not seen yet</p>
                          {notSeen.length ? notSeen.map(s => <p key={s.id} className="text-muted-foreground">{s.full_name}</p>) : <p className="text-muted-foreground">Everyone has seen it</p>}
                        </div>
                      </div>
                    </details>
                  );
                })()}
              </div>
            );
          })}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setC({ ...c, announcements: [{ id: crypto.randomUUID(), title: "", body: "", date: new Date().toISOString().slice(0, 10) }, ...c.announcements] })}><Plus className="mr-1 h-4 w-4" />Add announcement</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </CardContent>
      </Card>
      <div className="overflow-hidden rounded-xl border"><Landing content={c} /></div>
    </div>
  );
}
