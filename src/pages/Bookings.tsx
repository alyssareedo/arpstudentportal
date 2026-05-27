import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Clock, CalendarDays } from "lucide-react";
import { toast } from "sonner";

interface Booking {
  id: string;
  student_id: string;
  teacher_id: string | null;
  booking_date: string;
  start_time: string;
  duration_minutes: number;
  status: "pending" | "approved" | "declined" | "cancelled";
  student_message: string | null;
  admin_notes: string | null;
  lesson_id: string | null;
  created_at: string;
  student_name?: string;
  teacher_name?: string;
}

export default function Bookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("bookings").select("*").order("booking_date", { ascending: false }).order("start_time");
    const list = (data as Booking[]) ?? [];
    const userIds = Array.from(new Set([...list.map(b => b.student_id), ...list.map(b => b.teacher_id).filter(Boolean) as string[]]));
    if (userIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      list.forEach(b => { b.student_name = map.get(b.student_id); b.teacher_name = b.teacher_id ? map.get(b.teacher_id) : undefined; });
    }
    setBookings(list);

    const { data: roles } = await supabase.from("user_roles").select("user_id").in("role", ["admin","teacher"]);
    const tIds = (roles ?? []).map(r => r.user_id);
    if (tIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", tIds);
      setTeachers((profs as any) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("bookings-admin").on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const approve = async (b: Booking, teacherId: string, meetingLink: string, topic: string) => {
    const tId = teacherId || b.teacher_id || user!.id;
    // create lesson
    const { data: lesson, error: lErr } = await supabase.from("lessons").insert({
      student_id: b.student_id,
      teacher_id: tId,
      lesson_date: b.booking_date,
      lesson_time: b.start_time,
      topic: topic || "Lesson",
      zoom_link: meetingLink || null,
      attendance: "scheduled" as const,
    }).select().single();
    if (lErr) return toast.error(lErr.message);

    const { error } = await supabase.from("bookings").update({
      status: "approved", teacher_id: tId, lesson_id: lesson.id, decided_at: new Date().toISOString(), decided_by: user!.id,
    }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Booking approved & lesson created");
    load();
  };

  const decline = async (b: Booking) => {
    const { error } = await supabase.from("bookings").update({
      status: "declined", decided_at: new Date().toISOString(), decided_by: user!.id,
    }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Booking declined");
    load();
  };

  const groups = {
    pending: bookings.filter(b => b.status === "pending"),
    approved: bookings.filter(b => b.status === "approved"),
    history: bookings.filter(b => b.status === "declined" || b.status === "cancelled"),
  };

  if (loading) return <p className="text-center text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="pending">
        <TabsList className="rounded-full">
          <TabsTrigger value="pending" className="rounded-full">Pending ({groups.pending.length})</TabsTrigger>
          <TabsTrigger value="approved" className="rounded-full">Approved ({groups.approved.length})</TabsTrigger>
          <TabsTrigger value="history" className="rounded-full">History ({groups.history.length})</TabsTrigger>
        </TabsList>
        {(["pending","approved","history"] as const).map((key) => (
          <TabsContent key={key} value={key} className="space-y-3">
            {groups[key].length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Nothing here.</p>}
            {groups[key].map(b => (
              <BookingCard key={b.id} b={b} teachers={teachers} onApprove={approve} onDecline={decline} />
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function statusBadge(s: string) {
  switch (s) {
    case "pending": return <Badge variant="secondary" className="rounded-full"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
    case "approved": return <Badge className="rounded-full bg-success text-success-foreground hover:bg-success"><CheckCircle2 className="mr-1 h-3 w-3" />Approved</Badge>;
    case "declined": return <Badge variant="destructive" className="rounded-full"><XCircle className="mr-1 h-3 w-3" />Declined</Badge>;
    default: return <Badge variant="outline" className="rounded-full">Cancelled</Badge>;
  }
}

function BookingCard({ b, teachers, onApprove, onDecline }: {
  b: Booking;
  teachers: { id: string; full_name: string }[];
  onApprove: (b: Booking, tId: string, link: string, topic: string) => void;
  onDecline: (b: Booking) => void;
}) {
  const [teacherId, setTeacherId] = useState(b.teacher_id ?? "");
  const [link, setLink] = useState("");
  const [topic, setTopic] = useState("");

  return (
    <Card className="border-border/60 shadow-elegant">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <p className="font-semibold">{b.booking_date} · {b.start_time.slice(0,5)}</p>
          <Badge variant="outline" className="rounded-full">{b.duration_minutes} min</Badge>
          {statusBadge(b.status)}
        </div>
        <p className="text-sm"><span className="font-medium">Student:</span> {b.student_name ?? b.student_id.slice(0,8)}</p>
        {b.teacher_name && <p className="text-sm"><span className="font-medium">Teacher:</span> {b.teacher_name}</p>}
        {b.student_message && <p className="rounded-lg bg-secondary/50 p-2 text-sm">"{b.student_message}"</p>}

        {b.status === "pending" && (
          <div className="grid gap-2 border-t pt-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Assign teacher</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pick teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Topic</Label>
              <Input className="h-9" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Lesson topic" />
            </div>
            <div>
              <Label className="text-xs">Zoom / Teams link</Label>
              <Input className="h-9" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" />
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2">
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => onDecline(b)}>Decline</Button>
              <Button size="sm" className="rounded-full" onClick={() => onApprove(b, teacherId, link, topic)}>Approve & schedule</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
