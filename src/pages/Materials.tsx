import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { BookOpen, Star, StarOff, CheckCircle2, ExternalLink, FileText } from "lucide-react";

export default function Materials() {
  const { user } = useAuth();
  const [assigned, setAssigned] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoading(true);
    const { data: assigns } = await supabase.from("material_assignments").select("*, materials(*)").eq("student_id", user!.id);
    const { data: prog } = await supabase.from("material_progress").select("*").eq("student_id", user!.id);
    setAssigned(assigns ?? []);
    setProgress(Object.fromEntries((prog ?? []).map((p: any) => [p.material_id, p])));
    setLoading(false);
  };

  const upsertProgress = async (material_id: string, patch: any) => {
    const existing = progress[material_id];
    if (existing) {
      await supabase.from("material_progress").update(patch).eq("id", existing.id);
    } else {
      await supabase.from("material_progress").insert({ material_id, student_id: user!.id, ...patch });
    }
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

  const items = assigned.map(a => ({ ...a.materials, assignment: a, prog: progress[a.material_id] }));
  const favorites = items.filter(i => i.prog?.favorited);
  const completed = items.filter(i => i.prog?.status === "completed");
  const pct = items.length ? Math.round((completed.length / items.length) * 100) : 0;

  const render = (list: any[]) => list.length === 0 ? <p className="text-muted-foreground text-sm">Nothing here yet.</p> : (
    <div className="grid gap-3 md:grid-cols-2">
      {list.map(m => {
        const done = m.prog?.status === "completed";
        return (
          <Card key={m.id} className={done ? "border-green-500/40" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{m.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{m.type}</Badge>
                    {m.cefr_level && <Badge variant="outline">{m.cefr_level}</Badge>}
                    {m.skill && <Badge variant="outline">{m.skill}</Badge>}
                    {m.assignment?.required && <Badge className="bg-orange-500/10 text-orange-600" variant="outline">Required</Badge>}
                    {m.assignment?.due_date && <Badge variant="outline">Due {m.assignment.due_date}</Badge>}
                  </div>
                  {m.description && <p className="mt-2 text-sm text-muted-foreground">{m.description}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => upsertProgress(m.id, { favorited: !m.prog?.favorited })}>
                  {m.prog?.favorited ? <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="h-4 w-4" />}
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openMaterial(m)}>
                  {m.type === "link" ? <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />} Open
                </Button>
                <Button size="sm" variant={done ? "secondary" : "default"}
                  onClick={() => upsertProgress(m.id, { status: done ? "in_progress" : "completed", completed_at: done ? null : new Date().toISOString() })}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> {done ? "Mark incomplete" : "Mark complete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> My learning materials</CardTitle>
        <div className="mt-2">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Overall progress</span><span>{completed.length}/{items.length} · {pct}%</span>
          </div>
          <Progress value={pct} />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p>Loading…</p> : (
          <Tabs defaultValue="assigned">
            <TabsList><TabsTrigger value="assigned">Assigned</TabsTrigger><TabsTrigger value="favorites">Favorites</TabsTrigger><TabsTrigger value="completed">Completed</TabsTrigger></TabsList>
            <TabsContent value="assigned" className="mt-3">{render(items)}</TabsContent>
            <TabsContent value="favorites" className="mt-3">{render(favorites)}</TabsContent>
            <TabsContent value="completed" className="mt-3">{render(completed)}</TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
