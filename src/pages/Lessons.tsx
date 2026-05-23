import { useState } from "react";
import { Plus, Video, Calendar, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { lessons as seed, students } from "@/data/mockData";

function attendanceBadge(status: string) {
  switch (status) {
    case "present":
      return <Badge className="rounded-full bg-success text-success-foreground hover:bg-success"><CheckCircle2 className="mr-1 h-3 w-3" />Present</Badge>;
    case "absent":
      return <Badge className="rounded-full" variant="destructive"><XCircle className="mr-1 h-3 w-3" />Absent</Badge>;
    case "late":
      return <Badge className="rounded-full bg-warning text-warning-foreground hover:bg-warning"><Clock className="mr-1 h-3 w-3" />Late</Badge>;
    default:
      return <Badge variant="secondary" className="rounded-full"><Calendar className="mr-1 h-3 w-3" />Scheduled</Badge>;
  }
}

export default function Lessons() {
  const [data] = useState(seed);
  const [open, setOpen] = useState(false);
  const upcoming = data.filter((l) => l.attendance === "scheduled");
  const past = data.filter((l) => l.attendance !== "scheduled");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">All scheduled and past lessons</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground shadow-glow">
              <Plus className="mr-1 h-4 w-4" /> New lesson
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Schedule a lesson</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Student</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Pick a student" /></SelectTrigger>
                  <SelectContent>
                    {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2"><Label>Date</Label><Input type="date" /></div>
                <div className="grid gap-2"><Label>Time</Label><Input type="time" /></div>
              </div>
              <div className="grid gap-2"><Label>Topic</Label><Input placeholder="e.g. Present perfect & life experiences" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2"><Label>Zoom link</Label><Input placeholder="https://zoom.us/..." /></div>
                <div className="grid gap-2"><Label>Teams link</Label><Input placeholder="https://teams.microsoft.com/..." /></div>
              </div>
              <div className="grid gap-2"><Label>Homework</Label><Textarea rows={2} /></div>
              <div className="grid gap-2"><Label>Notes</Label><Textarea rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="gradient-primary text-primary-foreground" onClick={() => { setOpen(false); toast.success("Lesson scheduled"); }}>Save lesson</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="rounded-full">
          <TabsTrigger value="upcoming" className="rounded-full">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past" className="rounded-full">Past ({past.length})</TabsTrigger>
        </TabsList>

        {[
          { key: "upcoming", items: upcoming },
          { key: "past", items: past },
        ].map(({ key, items }) => (
          <TabsContent key={key} value={key} className="space-y-3">
            {items.map((l) => {
              const student = students.find((s) => s.id === l.studentId)!;
              return (
                <Card key={l.id} className="border-border/60 shadow-elegant transition-colors hover:bg-secondary/30">
                  <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={student.avatarUrl} />
                      <AvatarFallback>{student.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{l.topic}</p>
                        <Badge variant="outline" className="rounded-full">{student.level}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{student.name} · {l.date} at {l.time}</p>
                      {l.homework && <p className="mt-1 text-sm"><span className="font-medium">HW:</span> {l.homework}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(l.zoomLink || l.teamsLink) && (
                        <Button variant="outline" size="sm" className="rounded-full" asChild>
                          <a href={l.zoomLink || l.teamsLink} target="_blank" rel="noreferrer">
                            <Video className="mr-1 h-3.5 w-3.5" />
                            Join {l.zoomLink ? "Zoom" : "Teams"}
                          </a>
                        </Button>
                      )}
                      {attendanceBadge(l.attendance)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {items.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">No lessons here.</p>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
