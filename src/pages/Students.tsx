import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter, Sparkles, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useStudents, Level } from "@/hooks/useData";
import { RevealCredentialDialog } from "@/components/RevealCredentialDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const levels: ("all" | Level)[] = ["all", "A1", "A2", "B1", "B2", "C1", "C2"];

export default function Students() {
  const { students, loading, reload } = useStudents();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<"all" | Level>("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", level: "A1", goals: "", use_placeholder_email: false });
  const [newCredential, setNewCredential] = useState<{ email: string; password: string } | null>(null);

  const filtered = useMemo(() => students.filter((s) =>
    (level === "all" || s.level === level) &&
    (s.full_name.toLowerCase().includes(q.toLowerCase()) || s.email.toLowerCase().includes(q.toLowerCase()))
  ), [students, q, level]);

  const createStudent = async () => {
    if (!form.full_name) return toast.error("Name required");
    if (!form.use_placeholder_email && !form.email) return toast.error("Enter an email or turn on 'No email — generate one'");
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-create-student", { body: form });
    setBusy(false);
    if (error || (data as any)?.error) return toast.error((data as any)?.error ?? error?.message ?? "Failed");
    const link = (data as any)?.invite_link;
    const tempPwd = (data as any)?.temp_password;
    const createdEmail = (data as any)?.email;
    if (tempPwd) {
      setNewCredential({ email: createdEmail, password: tempPwd });
      toast.success("Student created");
    } else if (link) {
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success("Student created — invite link copied to clipboard");
    } else {
      toast.success("Student created");
    }
    setOpen(false);
    setForm({ full_name: "", email: "", level: "A1", goals: "", use_placeholder_email: false });
    reload();
  };

  const seedStudents = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("seed-students");
    setBusy(false);
    if (error) return toast.error(error.message);
    const list = (data as any)?.students ?? [];
    const created = list.filter((s: any) => s.status === "created").length;
    toast.success(`Seeded ${created} new students. Send each one a password-reset email to set their password.`);
    reload();
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast.success("Email copied");
  };


  return (
    <div className="space-y-6">
      <RevealCredentialDialog
        open={!!newCredential}
        onOpenChange={(v) => !v && setNewCredential(null)}
        title="Student login"
        description={newCredential ? `Sign-in email: ${newCredential.email}` : undefined}
        value={newCredential?.password ?? ""}
      />
      <Card className="border-border/60 shadow-elegant">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by name or email..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={level} onValueChange={(v) => setLevel(v as "all" | Level)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {levels.map((l) => <SelectItem key={l} value={l}>{l === "all" ? "All levels" : l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={seedStudents} disabled={busy}>
              <Sparkles className="mr-1 h-4 w-4" /> Seed 13 students
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground shadow-glow">
                  <Plus className="mr-1 h-4 w-4" /> Add student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add new student</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div className="grid gap-2"><Label>Full name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                  <div className="flex items-center justify-between rounded-md border border-border/60 p-2">
                    <div>
                      <Label className="text-sm">No email — generate one</Label>
                      <p className="text-xs text-muted-foreground">For younger students or accounts the school manages. Creates something like <code>name1234@arpspeak.local</code>.</p>
                    </div>
                    <Switch checked={form.use_placeholder_email} onCheckedChange={(v) => setForm({ ...form, use_placeholder_email: v })} />
                  </div>
                  {!form.use_placeholder_email && (
                    <div className="grid gap-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  )}
                  <p className="text-xs text-muted-foreground">A secure password is generated automatically. For real emails the student gets a password-reset link; for placeholder accounts the temp password is copied to your clipboard.</p>
                  <div className="grid gap-2"><Label>Level</Label>
                    <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["A1","A2","B1","B2","C1","C2"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2"><Label>Goals</Label><Input value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button disabled={busy} onClick={createStudent} className="gradient-primary text-primary-foreground">Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} className="group h-full border-border/60 shadow-elegant transition-all hover:-translate-y-0.5 hover:shadow-elevated">
              <CardContent className="p-5">
                <Link to={`/students/${s.id}`} className="flex items-start gap-3">
                  <UserAvatar className="h-14 w-14 ring-2 ring-primary/10" name={s.full_name} src={s.avatar_url} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{s.full_name}</h3>
                      <Badge variant="secondary" className="rounded-full">{s.level}</Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                    {s.goals && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.goals}</p>}
                  </div>
                </Link>
                <Button variant="ghost" size="sm" className="mt-3 w-full text-xs" onClick={() => copyEmail(s.email)}>
                  <Copy className="mr-1 h-3 w-3" /> Copy email
                </Button>

              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
              No students yet. Click "Seed 13 students" to add your class.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
