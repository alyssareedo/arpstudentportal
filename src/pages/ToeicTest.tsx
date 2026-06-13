import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  SECTION_LABELS,
  type ToeicSection,
  pickQuestions,
} from "@/lib/toeic-scoring";


interface QuestionRow {
  id: string;
  section: ToeicSection;
  difficulty: string;
  prompt: string;
  options: string[];
}


const PER_SECTION: Partial<Record<ToeicSection, number>> = {
  listening: 20,
  reading: 20,
  vocabulary: 20,
  grammar: 20,
  business_english: 15,
};

const SECTION_ORDER: ToeicSection[] = [
  "listening",
  "reading",
  "vocabulary",
  "grammar",
  "business_english",
];

type Step = "intro" | "loading" | "quiz" | "submitting";

export default function ToeicTest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("intro");
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [poolEmpty, setPoolEmpty] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);

  const current = questions[idx];
  const progress = questions.length ? ((idx + 1) / questions.length) * 100 : 0;

  async function start(selectedSections: ToeicSection[]) {
    setStep("loading");
    // Fetch sanitized questions via RPC. The answer key is never sent to the browser.
    const { data, error } = await supabase.rpc("get_toeic_questions");
    if (error) {
      toast.error("Could not load questions");
      setStep("intro");
      return;
    }
    const pool = (data as unknown as QuestionRow[]) ?? [];
    if (pool.length === 0) {
      setPoolEmpty(true);
      setStep("intro");
      return;
    }
    const picked = pickQuestions(
      pool,
      Object.fromEntries(selectedSections.map((section) => [section, PER_SECTION[section] ?? 0])) as Partial<Record<ToeicSection, number>>
    );
    if (picked.length === 0) {
      setPoolEmpty(true);
      setStep("intro");
      return;
    }
    setQuestions(picked);
    setIdx(0);
    setAnswers({});
    setStep("quiz");
  }

  async function submit() {
    if (!user) return;
    setStep("submitting");
    const payload = {
      answers: questions.map((q) => ({
        question_id: q.id,
        selected_answer: answers[q.id] ?? null,
      })),
    };
    const { data, error } = await supabase.functions.invoke("grade-toeic", { body: payload });
    if (error || !(data as any)?.assessment_id) {
      toast.error((data as any)?.error ?? error?.message ?? "Could not save your result");
      setStep("quiz");
      return;
    }
    navigate(`/assessments/toeic/${(data as any).assessment_id}`);
  }


  const answered = useMemo(
    () => questions.every((q) => answers[q.id] != null),
    [questions, answers]
  );

  if (step === "intro") {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Choose a test section</h1>
          <p className="text-sm text-muted-foreground">Select the part you want to practise today.</p>
        </div>
        {poolEmpty && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            The question bank is empty. Ask an admin to seed questions from Settings.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTION_ORDER.map((section) => (
            <Button
              key={section}
              variant="outline"
              className="h-auto justify-between p-4 text-left"
              onClick={() => start([section])}
              disabled={poolEmpty}
            >
              <span>
                <span className="block font-semibold">{SECTION_LABELS[section]}</span>
                <span className="block text-xs font-normal text-muted-foreground">{PER_SECTION[section]} questions</span>
              </span>
              <ArrowRight className="ml-3 h-4 w-4" />
            </Button>
          ))}
          <Button
            className="h-auto justify-between p-4 text-left sm:col-span-2"
            onClick={() => start(SECTION_ORDER)}
            disabled={poolEmpty}
          >
            <span>
              <span className="block font-semibold">Full TOEIC placement test</span>
              <span className="block text-xs font-normal text-primary-foreground/80">All 5 sections · 95 questions</span>
            </span>
            <ArrowRight className="ml-3 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === "loading" || step === "submitting") {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">
          {step === "loading" ? "Preparing your test…" : "Scoring your test…"}
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <Badge variant="secondary">{SECTION_LABELS[current.section]}</Badge>
          <span className="text-muted-foreground">
            {idx + 1} / {questions.length}
          </span>
        </div>
        <Progress value={progress} />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="whitespace-pre-wrap text-base font-medium">{current.prompt}</p>
          <RadioGroup
            value={answers[current.id] ?? ""}
            onValueChange={(v) => setAnswers((a) => ({ ...a, [current.id]: v }))}
          >
            {current.options.map((opt, i) => (
              <div key={i} className="flex items-start space-x-2 rounded-md border p-3">
                <RadioGroupItem value={opt} id={`opt-${i}`} className="mt-0.5" />
                <Label htmlFor={`opt-${i}`} className="cursor-pointer text-sm font-normal">
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
          Previous
        </Button>
        {idx < questions.length - 1 ? (
          <Button
            onClick={() => setIdx((i) => i + 1)}
            disabled={!answers[current.id]}
          >
            Next
          </Button>
        ) : (
          <Button onClick={submit} disabled={!answered}>
            Submit test
          </Button>
        )}
      </div>
    </div>
  );
}
