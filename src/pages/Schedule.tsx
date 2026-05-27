import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, CalendarDays, Clock } from "lucide-react";

interface Lesson {
  id: string;
  student_id: string;
  teacher_id: string | null;
  lesson_date: string;
  lesson_time: string;
  topic: string;
  zoom_link: string | null;
  teams_link: string | null;
  attendance: string;
  student_name?: string;
}

export default function Schedule() {
  const { user, role } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0,10);
    let q = supabase.from("lessons").select("*").gte("lesson_date", today).eq("attendance", "scheduled").order("lesson_date").order("lesson_time");
    if (role !== "admin") q = q.eq("student_id", user!.id);
    const { data } = await q;
    const list = (data as Lesson[]) ?? [];
    if (role === "admin" && list.length) {
      const ids = Array.from(new Set(list.map(l => l.student_id)));
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      list.forEach(l => { l.student_name = map.get(l.student_id); });
    }
    setLessons(list);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel("schedule-live").on("postgres_changes", { event: "*", schema: "public", table: "lessons" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, role]);

  if (loading) return <p className="text-center text-muted-foreground">Loading…</p>;

  const grouped = lessons.reduce<Record<string, Lesson[]>>((acc, l) => {
    (acc[l.lesson_date] ??= []).push(l); return acc;
  }, {});

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Live schedule — updates automatically.</p>
      {Object.keys(grouped).length === 0 && <p className="py-12 text-center text-muted-foreground">No upcoming lessons.</p>}
      {Object.entries(grouped).map(([date, items]) => (
        <Card key={date} className="border-border/60 shadow-elegant">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-primary" />{new Date(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {items.map(l => (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><Clock className="h-4 w-4" /></div>
                  <div>
                    <p className="font-medium">{l.lesson_time.slice(0,5)} · {l.topic || "Lesson"}</p>
                    {role === "admin" && <p className="text-xs text-muted-foreground">{l.student_name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">Scheduled</Badge>
                  {(l.zoom_link || l.teams_link) && (
                    <Button asChild size="sm" className="rounded-full">
                      <a href={l.zoom_link || l.teams_link!} target="_blank" rel="noreferrer"><Video className="mr-1 h-3.5 w-3.5" /> Join</a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
