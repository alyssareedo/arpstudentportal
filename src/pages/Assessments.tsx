import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Award, ArrowRight, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface ToeicRow {
  id: string;
  toeic_score: number;
  cefr_level: string | null;
  completed_at: string | null;
  created_at: string;
}
interface CefrRow {
  id: string;
  cefr_level: string | null;
  total_score: number | null;
  total_questions: number | null;
  created_at: string;
}

export default function Assessments() {
  const { user } = useAuth();
  const [toeic, setToeic] = useState<ToeicRow[]>([]);
  const [cefr, setCefr] = useState<CefrRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase
          .from("toeic_assessments")
          .select("id, toeic_score, cefr_level, completed_at, created_at")
          .eq("student_id", user.id)
          .not("completed_at", "is", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("cefr_assessments")
          .select("id, cefr_level, total_score, total_questions, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setToeic((t as ToeicRow[]) ?? []);
      setCefr((c as CefrRow[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const chartData = [...toeic]
    .reverse()
    .map((r) => ({
      date: new Date(r.completed_at ?? r.created_at).toLocaleDateString(),
      score: r.toeic_score,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Language Assessments</h1>
        <p className="text-sm text-muted-foreground">
          Track your level and find what to study next.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" /> TOEIC Placement Test
              </CardTitle>
              <Badge variant="secondary">10–990</Badge>
            </div>
            <CardDescription>
              5 sections · Listening, Reading, Vocabulary, Grammar, Business English
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Get an estimated TOEIC score and CEFR level with detailed feedback.
            </p>
            <Button asChild>
              <Link to="/assessments/toeic">
                Take TOEIC test <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-emerald-600" /> CEFR Assessment
              </CardTitle>
              <Badge variant="secondary">A1–C2</Badge>
            </div>
            <CardDescription>30-question quick level check (~15 min)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Free CEFR level test. Repeat every 3–6 months to see your growth.
            </p>
            <Button asChild variant="outline">
              <Link to="/cefr-test">
                Take CEFR test <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-muted bg-muted/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-muted-foreground" /> TOEFL Assessment
              </CardTitle>
              <Badge variant="outline">Coming soon</Badge>
            </div>
            <CardDescription>iBT-style practice — in development</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Available in a future release.</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" /> TOEIC progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis domain={[0, 990]} fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>TOEIC history</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : toeic.length === 0 ? (
            <p className="text-sm text-muted-foreground">No TOEIC attempts yet.</p>
          ) : (
            <div className="space-y-2">
              {toeic.map((r) => (
                <Link
                  key={r.id}
                  to={`/assessments/toeic/${r.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-accent"
                >
                  <div>
                    <div className="font-semibold">{r.toeic_score} / 990</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.completed_at ?? r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Badge>{r.cefr_level ?? "—"}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {cefr.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>CEFR history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cefr.map((r) => (
                <Link
                  key={r.id}
                  to={`/assessments/cefr/${r.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-accent"
                >
                  <div className="text-sm text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()} ·{" "}
                    {r.total_score ?? 0}/{r.total_questions ?? 0}
                  </div>
                  <Badge variant="secondary">{r.cefr_level ?? "—"}</Badge>
                </Link>
              ))}

            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
