import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Landing, { defaultLanding, useLandingContent } from "./Landing";

export default function AdminLanding() {
  const [c, setC] = useLandingContent();
  const [saving, setSaving] = useState(false);

  const upload = async (file: File) => {
    const path = `landing/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setC({ ...c, photo_url: data.publicUrl });
    toast.success("Photo uploaded — click Save to publish");
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("landing_content").upsert({ id: 1, content: c, updated_at: new Date().toISOString() });
    setSaving(false);
    error ? toast.error(error.message) : toast.success("Home page saved");
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
          <h3 className="mt-2 font-semibold">Thai version (ภาษาไทย)</h3>
          <div><Label>Headline (Thai)</Label><Input value={c.headline_th} onChange={e => setC({ ...c, headline_th: e.target.value })} /></div>
          <div><Label>Intro text (Thai)</Label><Textarea value={c.subtitle_th} onChange={e => setC({ ...c, subtitle_th: e.target.value })} /></div>
          {(c.bullets_th ?? []).map((b, i) => (
            <div key={i}><Label>Point {i + 1} (Thai)</Label><Input value={b} onChange={e => { const bl = [...c.bullets_th]; bl[i] = e.target.value; setC({ ...c, bullets_th: bl }); }} /></div>
          ))}
          <div><Label>Bottom banner heading (Thai)</Label><Input value={c.cta_heading_th} onChange={e => setC({ ...c, cta_heading_th: e.target.value })} /></div>
          <div className="flex flex-wrap items-end gap-3">
            <div><Label>Photo</Label><Input type="file" accept="image/*" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} /></div>
            {c.photo_url && <Button variant="outline" onClick={() => setC({ ...c, photo_url: "" })}>Use default photo</Button>}
          </div>
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
            <Button variant="ghost" onClick={() => setC(defaultLanding)}>Reset to default text</Button>
          </div>
        </CardContent>
      </Card>
      <div className="overflow-hidden rounded-xl border"><Landing content={c} /></div>
    </div>
  );
}
