import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";

const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

interface Slot { id: string; weekday: number; start_time: string; end_time: string; is_active: boolean; }
interface Booking { id: string; booking_date: string; start_time: string; duration_minutes: number; status: string; }

function nextNDates(n: number) {
  const arr: Date[] = [];
  const d = new Date(); d.setHours(0,0,0,0);
  for (let i = 0; i < n; i++) { arr.push(new Date(d.getTime() + i * 86400000)); }
  return arr;
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function* hourRange(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  for (let h = sh; h + 1 <= eh + (em > 0 ? 1 : 0) && h < eh; h++) {
    yield `${String(h).padStart(2,"0")}:${String(sm).padStart(2,"0")}`;
  }
}

export default function BookLesson() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [allBookings, setAllBookings] = useState<{ booking_date: string; start_time: string; status: string; }[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<{ date: string; time: string } | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: mb }] = await Promise.all([
      supabase.from("availability_slots").select("id, weekday, start_time, end_time, is_active").eq("is_active", true),
      supabase.from("bookings").select("*").eq("student_id", user!.id).order("booking_date", { ascending: false }),
    ]);
    setSlots((s as Slot[]) ?? []);
    setMyBookings((mb as Booking[]) ?? []);
    // We can't see others' bookings, so we rely on admin's approval to prevent conflicts.
    setAllBookings((mb as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const dates = nextNDates(14);
  const takenByMe = useMemo(() => new Set(myBookings.filter(b => b.status === "pending" || b.status === "approved").map(b => `${b.booking_date}_${b.start_time.slice(0,5)}`)), [myBookings]);

  const slotsByWeekday = useMemo(() => {
    const map = new Map<number, Slot[]>();
    slots.forEach(s => { const a = map.get(s.weekday) ?? []; a.push(s); map.set(s.weekday, a); });
    return map;
  }, [slots]);

  const submit = async () => {
    if (!picked) return;
    const { error } = await supabase.from("bookings").insert({
      student_id: user!.id,
      booking_date: picked.date,
      start_time: picked.time + ":00",
      duration_minutes: 60,
      status: "pending",
      student_message: message || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Booking requested! You'll be notified when it's approved.");
    setPicked(null); setMessage("");
    load();
  };

  if (loading) return <p className="text-center text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-elegant overflow-hidden">
        <div className="gradient-hero p-5 text-primary-foreground">
          <div className="flex items-center gap-2"><Sparkles className="h-5 w-5" /><h2 className="text-xl font-bold">Book a lesson</h2></div>
          <p className="mt-1 text-sm opacity-90">Pick any open time — your teacher will confirm shortly.</p>
        </div>
      </Card>

      <div className="space-y-3">
        {dates.map(d => {
          const wd = d.getDay();
          const daySlots = slotsByWeekday.get(wd) ?? [];
          if (daySlots.length === 0) return null;
          const dateStr = fmtDate(d);
          const times: string[] = [];
          daySlots.forEach(s => { for (const t of hourRange(s.start_time, s.end_time)) times.push(t); });
          const unique = Array.from(new Set(times)).sort();
          return (
            <Card key={dateStr} className="border-border/60 shadow-elegant">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {WEEKDAYS[wd]} · {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {unique.map(t => {
                  const key = `${dateStr}_${t}`;
                  const taken = takenByMe.has(key);
                  return (
                    <Button
                      key={t}
                      variant={taken ? "secondary" : "outline"}
                      size="sm"
                      disabled={taken}
                      className="rounded-full"
                      onClick={() => setPicked({ date: dateStr, time: t })}
                    >
                      <Clock className="mr-1 h-3 w-3" /> {t} {taken && "· requested"}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
        {slots.length === 0 && <p className="text-center text-sm text-muted-foreground">No availability is set yet. Please check back soon.</p>}
      </div>

      <Card className="border-border/60 shadow-elegant">
        <CardHeader><CardTitle className="text-base">My booking requests</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {myBookings.length === 0 && <p className="text-sm text-muted-foreground">No bookings yet.</p>}
          {myBookings.map(b => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">{b.booking_date} · {b.start_time.slice(0,5)}</p>
                <p className="text-xs text-muted-foreground">{b.duration_minutes} min</p>
              </div>
              <Badge variant={b.status === "approved" ? "default" : b.status === "declined" ? "destructive" : "secondary"} className="rounded-full capitalize">
                {b.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request lesson</DialogTitle></DialogHeader>
          {picked && (
            <div className="space-y-3">
              <p className="text-sm"><span className="font-medium">{picked.date}</span> at <span className="font-medium">{picked.time}</span> (60 min)</p>
              <div>
                <Label>Message (optional)</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Anything you'd like to focus on?" maxLength={500} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPicked(null)}>Cancel</Button>
            <Button onClick={submit}>Send request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
