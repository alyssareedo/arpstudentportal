import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { toast } from "sonner";

interface Row {
  id: string;
  user_id: string | null;
  full_name: string;
  cefr_level: string | null;
  total_score: number | null;
  total_questions: number | null;
  created_at: string;
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function AdminCefrResults() {
  const { role } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("all");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("cefr_assessments")
      .select("id, user_id, full_name, cefr_level, total_score, total_questions, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("Could not load CEFR results");
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (name && !(r.full_name ?? "").toLowerCase().includes(name.toLowerCase())) return false;
        if (level !== "all" && r.cefr_level !== level) return false;
        return true;
      }),
    [rows, name, level]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          CEFR results ({filtered.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Open a result for the question-by-question review and PDF export.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Student name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Search…" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">CEFR level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CEFR_LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No CEFR results yet.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-accent">
                <Link to={`/assessments/cefr/${r.id}`} className="flex flex-1 items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                      {!r.user_id && " · guest"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {r.total_score ?? 0}/{r.total_questions ?? 0}
                    </span>
                    <Badge>{r.cefr_level ?? "—"}</Badge>
                  </div>
                </Link>
                {role === "admin" && (
                  <div className="ml-2">
                    <ConfirmDeleteButton
                      title="Delete this CEFR result?"
                      description="The test attempt and its answers are permanently removed."
                      onConfirm={async () => {
                        await supabase.from("cefr_assessment_answers").delete().eq("assessment_id", r.id);
                        const { error } = await supabase.from("cefr_assessments").delete().eq("id", r.id);
                        if (error) throw error;
                        toast.success("Result deleted");
                        load();
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
