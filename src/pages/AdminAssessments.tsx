import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

interface Row {
  id: string;
  student_id: string;
  toeic_score: number;
  cefr_level: string | null;
  completed_at: string | null;
  created_at: string;
  student_name?: string;
  student_email?: string;
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export default function AdminAssessments() {
  const { role } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [cefr, setCefr] = useState<string>("all");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("toeic_assessments")
      .select("id, student_id, toeic_score, cefr_level, completed_at, created_at")
      .not("completed_at", "is", null)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Could not load assessments");
      setLoading(false);
      return;
    }
    const list = (data as Row[]) ?? [];
    if (list.length) {
      const ids = Array.from(new Set(list.map((r) => r.student_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      list.forEach((r) => {
        const p = map.get(r.student_id);
        r.student_name = p?.full_name;
        r.student_email = p?.email;
      });
    }
    setRows(list);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const date = new Date(r.completed_at ?? r.created_at);
      if (from && date < new Date(from)) return false;
      if (to && date > new Date(to + "T23:59:59")) return false;
      if (name && !(r.student_name ?? "").toLowerCase().includes(name.toLowerCase())) return false;
      if (cefr !== "all" && r.cefr_level !== cefr) return false;
      if (minScore && r.toeic_score < Number(minScore)) return false;
      if (maxScore && r.toeic_score > Number(maxScore)) return false;
      return true;
    });
  }, [rows, from, to, name, cefr, minScore, maxScore]);

  async function seed() {
    setSeeding(true);
    const { data, error } = await supabase.functions.invoke("seed-toeic-questions");
    setSeeding(false);
    if (error) {
      toast.error(error.message ?? "Failed to seed questions");
      return;
    }
    toast.success(`Inserted: ${JSON.stringify((data as { inserted?: unknown })?.inserted ?? {})}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assessments</h1>
          <p className="text-sm text-muted-foreground">
            View and filter every TOEIC placement test attempt.
          </p>
        </div>
        {role === "admin" && (
          <Button variant="outline" onClick={seed} disabled={seeding}>
            {seeding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Seed question bank
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-6">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Student name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Search…" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">CEFR</Label>
            <Select value={cefr} onValueChange={setCefr}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CEFR_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Min score</Label>
              <Input type="number" value={minScore} onChange={(e) => setMinScore(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max score</Label>
              <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matching results.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <Link
                  key={r.id}
                  to={`/assessments/toeic/${r.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-accent"
                >
                  <div>
                    <div className="font-medium">{r.student_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.student_email ?? ""} ·{" "}
                      {new Date(r.completed_at ?? r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{r.toeic_score}</span>
                    <Badge>{r.cefr_level ?? "—"}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
