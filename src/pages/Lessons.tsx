import { Video, Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAllLessons } from "@/hooks/useData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EditLessonDialog } from "./StudentDetail";
import { useAuth } from "@/hooks/useAuth";

function attendanceBadge(status: string) {
  switch (status) {
    case "present": return <Badge className="rounded-full bg-success text-success-foreground hover:bg-success"><CheckCircle2 className="mr-1 h-3 w-3" />Present</Badge>;
    case "absent": return <Badge className="rounded-full" variant="destructive"><XCircle className="mr-1 h-3 w-3" />Absent</Badge>;
    case "late": return <Badge className="rounded-full bg-warning text-warning-foreground hover:bg-warning"><Clock className="mr-1 h-3 w-3" />Late</Badge>;
    default: return <Badge variant="secondary" className="rounded-full"><Calendar className="mr-1 h-3 w-3" />Scheduled</Badge>;
  }
}

export default function Lessons() {
  const { lessons, loading, reload } = useAllLessons();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const upcoming = lessons.filter((l) => l.attendance === "scheduled");
  const past = lessons.filter((l) => l.attendance !== "scheduled");

  const updateAttendance = async (id: string, value: string) => {
    const { error } = await supabase.from("lessons").update({ attendance: value as any, completed: value !== "scheduled" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    reload();
  };

  if (loading) return <p className="text-center text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">All scheduled and past lessons. Add lessons from each student's profile.</p>

      <Tabs defaultValue="upcoming">
        <TabsList className="rounded-full">
          <TabsTrigger value="upcoming" className="rounded-full">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past" className="rounded-full">Past ({past.length})</TabsTrigger>
        </TabsList>

        {[{ key: "upcoming", items: upcoming }, { key: "past", items: past }].map(({ key, items }) => (
          <TabsContent key={key} value={key} className="space-y-3">
            {items.map((l) => (
              <Card key={l.id} className="border-border/60 shadow-elegant transition-colors hover:bg-secondary/30">
                <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={l.profiles.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${l.profiles.full_name}`} />
                    <AvatarFallback>{l.profiles.full_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{l.topic || "Untitled lesson"}</p>
                      <Badge variant="outline" className="rounded-full">{l.profiles.level}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{l.profiles.full_name} · {l.lesson_date} at {l.lesson_time}</p>
                    {l.homework && <p className="mt-1 text-sm"><span className="font-medium">HW:</span> {l.homework}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(l.zoom_link || l.teams_link) && (
                      <Button variant="outline" size="sm" className="rounded-full" asChild>
                        <a href={l.zoom_link || l.teams_link!} target="_blank" rel="noreferrer">
                          <Video className="mr-1 h-3.5 w-3.5" /> Join
                        </a>
                      </Button>
                    )}
                    <Select value={l.attendance} onValueChange={(v) => updateAttendance(l.id, v)}>
                      <SelectTrigger className="h-8 w-32 rounded-full text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="present">Present</SelectItem>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                      </SelectContent>
                    </Select>
                    {attendanceBadge(l.attendance)}
                    {isAdmin && <EditLessonDialog lesson={l} onSaved={reload} />}
                </CardContent>
              </Card>
            ))}
            {items.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No lessons here.</p>}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
