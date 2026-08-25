import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

type Category = "grammar" | "vocabulary" | "reading" | "listening";
type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

// Sanitized question shape returned by get_cefr_questions(). The correct answer
// is never sent to the browser before the test is submitted.
interface Question {
  id: string;
  category: Category;
  level: Level;
  prompt: string;
  passage?: string | null;
  options: string[];
  sort_order: number;
}

interface ReviewItem {
  question_id: string;
  level: Level;
  category: Category;
  prompt: string;
  passage: string | null;
  options: string[];
  selected_answer: number | null;
  selected_text: string | null;
  correct_answer: number;
  correct_text: string | null;
  is_correct: boolean;
  explanation: string | null;
}

interface GradeResult {
  assessment_id: string;
  level: Level;
  name: string;
  description: string;
  total: number;
  total_questions: number;
  breakdown: Record<Category, { correct: number; total: number }>;
  review: ReviewItem[];
}

type Step = "quiz" | "result";

export default function CefrTest() {
  const [step, setStep] = useState<Step>("quiz");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [qIndex, setQIndex] = useState(0);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_cefr_questions");
      if (error) {
        toast.error("Could not load the test. Please try again.");
      } else {
        setQuestions(
          ((data ?? []) as any[]).map((q) => ({
            id: q.id,
            category: q.category as Category,
            level: q.level as Level,
            prompt: q.prompt,
            passage: q.passage,
            options: (q.options ?? []) as string[],
            sort_order: q.sort_order,
          })),
        );
      }
      setLoading(false);
    })();
  }, []);

  const current = questions[qIndex];
  const progress = questions.length
    ? ((qIndex + (current && answers[current.id] !== undefined ? 1 : 0)) / questions.length) * 100
    : 0;

  async function finish() {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("grade-cefr", {
      body: {
        answers: questions.map((q) => ({
          question_id: q.id,
          selected_answer: answers[q.id] ?? null,
        })),
      },
    });
    setSubmitting(false);
    if (error || !data || (data as any).error) {
      toast.error("Could not submit your test. Please try again.");
      return;
    }
    setResult(data as GradeResult);
    setStep("result");
    toast.success("Result saved! We'll be in touch on LINE within 24 hours.");
  }

  function next() {
    if (answers[current.id] === undefined) {
      toast.error("Please choose an answer");
      return;
    }
    if (qIndex < questions.length - 1) setQIndex(qIndex + 1);
    else finish();
  }

  function restart() {
    setStep("quiz");
    setAnswers({});
    setQIndex(0);
    setResult(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="ARP Speak English" className="h-10 w-10 rounded-lg bg-white p-1" />
            <div className="leading-tight">
              <div className="font-bold">ARP Speak English</div>
              <div className="text-xs text-muted-foreground">Free CEFR Assessment</div>
            </div>
          </Link>
          <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {step === "quiz" && loading && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Loading the test…</CardContent></Card>
        )}

        {step === "quiz" && !loading && questions.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">The test is unavailable right now.</CardContent></Card>
        )}

        {step === "quiz" && current && (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">Question {qIndex + 1} of {questions.length}</Badge>
                <Badge>{current.category}</Badge>
              </div>
              <Progress value={progress} />
            </CardHeader>
            <CardContent className="space-y-6">
              {current.passage && (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm italic">{current.passage}</div>
              )}
              <h2 className="text-xl font-semibold">{current.prompt}</h2>
              <RadioGroup
                value={answers[current.id] !== undefined ? String(answers[current.id]) : ""}
                onValueChange={(v) => setAnswers((a) => ({ ...a, [current.id]: parseInt(v) }))}
              >
                {current.options.map((opt, i) => (
                  <label key={i} htmlFor={`q${current.id}-${i}`} className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/30 transition">
                    <RadioGroupItem value={String(i)} id={`q${current.id}-${i}`} />
                    <span>{opt}</span>
                  </label>
                ))}
              </RadioGroup>
              <div className="flex justify-between pt-2">
                <Button variant="outline" disabled={qIndex === 0} onClick={() => setQIndex(qIndex - 1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <Button onClick={next} disabled={submitting}>
                  {qIndex === questions.length - 1 ? (submitting ? "Submitting…" : "Finish") : "Next"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "result" && result && (
          <div className="space-y-6">
            <Card className="shadow-lg border-primary/30">
              <CardHeader className="text-center">
                <Badge variant="secondary" className="mx-auto mb-2">Your CEFR level</Badge>
                <div className="text-6xl font-bold text-primary">{result.level}</div>
                <CardTitle className="mt-2">{result.name}</CardTitle>
                <p className="text-muted-foreground">{result.description}</p>
                <p className="text-sm mt-2">Score: <strong>{result.total} / {result.total_questions}</strong></p>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader><CardTitle>Score breakdown</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-4">
                {(Object.keys(result.breakdown) as Category[]).map((c) => {
                  const b = result.breakdown[c];
                  const pct = b.total ? (b.correct / b.total) * 100 : 0;
                  return (
                    <div key={c}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize font-medium">{c}</span>
                        <span className="text-muted-foreground">{b.correct} / {b.total}</span>
                      </div>
                      <Progress value={pct} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Answer review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.review.map((r, i) => (
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


            <Card className="bg-primary/5 border-primary/30">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold text-lg">What's next?</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Our team will send a full evaluation to your LINE within 24 hours.</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Free 1-on-1 trial lesson with a native teacher.</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> Personalised course recommendation based on your goals.</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5" /> No cost, no strings attached.</li>
                </ul>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button onClick={restart} variant="outline">Take the test again</Button>
                  <Link to="/auth"><Button>Create an account</Button></Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
