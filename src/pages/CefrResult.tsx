import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ArrowLeft, Download } from "lucide-react";
import { generateCefrReport, type CefrReviewItem } from "@/lib/cefr-pdf";

interface Assessment {
  id: string;
  user_id: string | null;
  full_name: string;
  cefr_level: string | null;
  total_score: number | null;
  total_questions: number | null;
  score_grammar: number | null;
  score_vocabulary: number | null;
  score_reading: number | null;
  score_listening: number | null;
  created_at: string;
}

interface ReviewRow extends CefrReviewItem {
  question_id: string;
  passage: string | null;
}

export default function CefrResult() {
  const { id } = useParams();
  const { role } = useAuth();
  const isStaff = role === "admin" || role === "teacher";
  const [a, setA] = useState<Assessment | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: assess } = await supabase
        .from("cefr_assessments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!assess) {
        setLoading(false);
        return;
      }
      setA(assess as unknown as Assessment);

      const uid = (assess as { user_id: string | null }).user_id;
      if (uid) {
        const { data: prof } = await supabase.from("profiles").select("email").eq("id", uid).maybeSingle();
        setEmail(prof?.email ?? null);
      }

      const { data: rev } = await supabase.rpc("get_cefr_review", { _assessment_id: id });
      setReview(((rev ?? []) as unknown as ReviewRow[]).map((r) => ({
        ...r,
        options: Array.isArray(r.options) ? r.options : JSON.parse(String(r.options)),
      })));
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p className="text-center text-muted-foreground">Loading…</p>;
  if (!a)
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Result not found.</p>
        <Button asChild variant="link"><Link to="/assessments">Back</Link></Button>
      </div>
    );

  const breakdown = [
    { label: "Grammar", correct: a.score_grammar ?? 0, total: 0 },
    { label: "Vocabulary", correct: a.score_vocabulary ?? 0, total: 0 },
    { label: "Reading", correct: a.score_reading ?? 0, total: 0 },
    { label: "Listening", correct: a.score_listening ?? 0, total: 0 },
  ].map((b) => {
    const cat = b.label.toLowerCase();
    const total = review.filter((r) => r.category === cat).length;
    return { ...b, total: total || Math.round((a.total_questions ?? 0) / 4) };
  });

  async function download() {
    if (!a) return;
    try {
      await generateCefrReport({
        studentName: a.full_name,
        studentEmail: email,
        takenAt: a.created_at,
        cefrLevel: a.cefr_level ?? "—",
        totalScore: a.total_score ?? 0,
        totalQuestions: a.total_questions ?? review.length,
        breakdown,
        review,
      });
    } catch {
      toast.error("Could not generate the PDF");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={isStaff ? "/admin/assessments" : "/assessments"}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>
        <Button onClick={download}>
          <Download className="mr-2 h-4 w-4" /> Download PDF report
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CEFR placement result</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="text-base">{a.cefr_level ?? "—"}</Badge>
            <span className="text-sm text-muted-foreground">
              {a.full_name} · {new Date(a.created_at).toLocaleString()}
            </span>
          </div>
          <p className="text-2xl font-bold">
            {a.total_score ?? 0} / {a.total_questions ?? review.length}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {breakdown.map((b) => {
              const pct = b.total ? Math.round((b.correct / b.total) * 100) : 0;
              return (
                <div key={b.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{b.label}</span>
                    <span className="text-muted-foreground">{b.correct} / {b.total}</span>
                  </div>
                  <Progress value={pct} />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {review.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Answer review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {review.map((r, i) => (
              <div key={r.question_id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="secondary">{r.level}</Badge>
                  <span className={`text-xs font-semibold ${r.is_correct ? "text-emerald-600" : "text-destructive"}`}>
                    {r.is_correct ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <p className="mb-3 whitespace-pre-wrap text-sm font-medium">
                  {i + 1}. {r.prompt}
                </p>
                {r.passage && (
                  <div className="mb-3 rounded border bg-muted/40 p-3 text-sm italic">{r.passage}</div>
                )}
                <div className="space-y-1">
                  {r.options.map((opt, idx) => {
                    const isCorrect = idx === r.correct_answer;
                    const isSelected = idx === r.selected_answer;
                    return (
                      <div
                        key={idx}
                        className={`rounded-md border px-3 py-2 text-sm ${
                          isCorrect
                            ? "border-emerald-500/50 bg-emerald-500/10"
                            : isSelected
                            ? "border-destructive/50 bg-destructive/10"
                            : ""
                        }`}
                      >
                        {opt}
                        {isCorrect && <span className="ml-2 text-xs text-emerald-600">Correct answer</span>}
                        {isSelected && !isCorrect && (
                          <span className="ml-2 text-xs text-destructive">Your answer</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {r.selected_answer == null && (
                  <p className="mt-2 text-xs text-muted-foreground">No answer given.</p>
                )}
                {r.explanation && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Why: </span>{r.explanation}
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
