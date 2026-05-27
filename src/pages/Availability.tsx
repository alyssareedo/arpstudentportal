import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Clock } from "lucide-react";
import { toast } from "sonner";

const WEEKDAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

interface Slot {
  id: string;
  teacher_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface TeacherOpt { id: string; full_name: string; }

export default function Availability() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [slots, setSlots] = useState<Slot[]>([]);
  const [teachers, setTeachers] = useState<TeacherOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    teacher_id: user?.id ?? "",
    weekday: "1",
    start_time: "09:00",
    end_time: "10:00",
  });

  const load = async () => {
    setLoading(true);
    const q = isAdmin
      ? supabase.from("availability_slots").select("*").order("weekday").order("start_time")
      : supabase.from("availability_slots").select("*").eq("teacher_id", user!.id).order("weekday").order("start_time");
    const { data } = await q;
    setSlots((data as Slot[]) ?? []);

    // load teachers (admins + teachers) for the dropdown
    const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ["admin","teacher"]);
    const ids = Array.from(new Set((roles ?? []).map(r => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setTeachers((profs as TeacherOpt[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const addSlot = async () => {
    if (form.end_time <= form.start_time) return toast.error("End time must be after start time");
    const { error } = await supabase.from("availability_slots").insert({
      teacher_id: form.teacher_id || user!.id,
      weekday: parseInt(form.weekday),
      start_time: form.start_time,
      end_time: form.end_time,
    });
    if (error) return toast.error(error.message);
    toast.success("Availability added");
    load();
  };

  const toggle = async (id: string, val: boolean) => {
    await supabase.from("availability_slots").update({ is_active: val }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("availability_slots").delete().eq("id", id);
    toast.success("Removed");
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Plus className="h-4 w-4" /> Add a recurring availability slot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {isAdmin && (
            <div>
              <Label>Teacher</Label>
              <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Day</Label>
            <Select value={form.weekday} onValueChange={(v) => setForm({ ...form, weekday: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Start</Label>
            <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          </div>
          <div>
            <Label>End</Label>
            <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>
          <div className="flex items-end">
            <Button className="w-full rounded-full" onClick={addSlot}>Add slot</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-elegant">
        <CardHeader><CardTitle className="text-base">Weekly availability</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">No slots yet. Add one above.</p>
          ) : (
            <div className="space-y-2">
              {slots.map((s) => {
                const tName = teachers.find(t => t.id === s.teacher_id)?.full_name ?? "—";
                return (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-3">
                    <Badge variant="secondary" className="rounded-full">{WEEKDAYS[s.weekday]}</Badge>
                    <div className="flex items-center gap-1 text-sm font-medium"><Clock className="h-3.5 w-3.5" /> {s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}</div>
                    {isAdmin && <span className="text-xs text-muted-foreground">{tName}</span>}
                    <div className="ml-auto flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch checked={s.is_active} onCheckedChange={(v) => toggle(s.id, v)} />
                        <span className="text-xs text-muted-foreground">{s.is_active ? "Active" : "Off"}</span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
