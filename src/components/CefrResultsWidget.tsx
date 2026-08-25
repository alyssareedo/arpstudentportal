import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileText } from "lucide-react";

interface Row {
  id: string;
  cefr_level: string | null;
  total_score: number | null;
  total_questions: number | null;
  score_grammar: number | null;
  score_vocabulary: number | null;
  score_reading: number | null;
  score_listening: number | null;
  created_at: string;
}

export function CefrResultsWidget({ studentId }: { studentId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cefr_assessments")
        .select("id, cefr_level, total_score, total_questions, score_grammar, score_vocabulary, score_reading, score_listening, created_at")
        .eq("user_id", studentId)
        .order("created_at", { ascending: false });
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, [studentId]);

  const latest = rows[0];
  const perSkill = latest
    ? [
        { label: "Grammar", v: latest.score_grammar ?? 0 },
        { label: "Vocabulary", v: latest.score_vocabulary ?? 0 },
        { label: "Reading", v: latest.score_reading ?? 0 },
        { label: "Listening", v: latest.score_listening ?? 0 },
      ]
    : [];
  const perSkillTotal = latest ? Math.max(1, Math.round((latest.total_questions ?? 0) / 4)) : 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">CEFR results</CardTitle>
        {latest && <Badge>{latest.cefr_level ?? "—"}</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !latest ? (
          <p className="text-sm text-muted-foreground">No CEFR test taken yet.</p>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              Last test: {new Date(latest.created_at).toLocaleDateString()} ·{" "}
              <span className="font-medium text-foreground">
                {latest.total_score ?? 0} / {latest.total_questions ?? 0}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {perSkill.map((s) => (
                <div key={s.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{s.label}</span>
                    <span className="text-muted-foreground">{s.v} / {perSkillTotal}</span>
                  </div>
                  <Progress value={Math.min(100, Math.round((s.v / perSkillTotal) * 100))} />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to={`/assessments/cefr/${latest.id}`}>
                  <FileText className="mr-2 h-4 w-4" /> Review & export PDF
                </Link>
              </Button>
            </div>
            {rows.length > 1 && (
              <div className="space-y-1 pt-2">
                <p className="text-xs font-medium text-muted-foreground">Earlier tests</p>
                {rows.slice(1).map((r) => (
                  <Link
                    key={r.id}
                    to={`/assessments/cefr/${r.id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition hover:bg-accent"
                  >
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground">{r.total_score ?? 0}/{r.total_questions ?? 0}</span>
                      <Badge variant="secondary">{r.cefr_level ?? "—"}</Badge>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
