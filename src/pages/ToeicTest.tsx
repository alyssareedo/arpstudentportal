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
  calculateToeic,
  pickQuestions,
  type SectionScore,
} from "@/lib/toeic-scoring";

interface QuestionRow {
  id: string;
  section: ToeicSection;
  difficulty: string;
  prompt: string;
  options: string[];
  correct_answer: string;
}

const PER_SECTION: Partial<Record<ToeicSection, number>> = {
  listening: 20,
  reading: 20,
  vocabulary: 20,
  grammar: 20,
  business_english: 15,
};

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

  async function start() {
    setStep("loading");
    const { data, error } = await supabase
      .from("toeic_questions")
      .select("id, section, difficulty, prompt, options, correct_answer")
      .limit(1000);
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
    const picked = pickQuestions(pool, PER_SECTION);
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
    const bySection: Record<ToeicSection, { correct: number; total: number }> = {
      listening: { correct: 0, total: 0 },
      reading: { correct: 0, total: 0 },
      vocabulary: { correct: 0, total: 0 },
      grammar: { correct: 0, total: 0 },
      business_english: { correct: 0, total: 0 },
    };
    questions.forEach((q) => {
      bySection[q.section].total += 1;
      if (answers[q.id] === q.correct_answer) bySection[q.section].correct += 1;
    });
    const sections: SectionScore[] = (Object.keys(bySection) as ToeicSection[])
      .filter((s) => bySection[s].total > 0)
      .map((s) => ({
        section: s,
        correct: bySection[s].correct,
        total: bySection[s].total,
        percent: bySection[s].correct / bySection[s].total,
      }));

    const result = calculateToeic(sections);

    const { data: inserted, error } = await supabase
      .from("toeic_assessments")
      .insert({
        student_id: user.id,
        completed_at: new Date().toISOString(),
        score_listening: bySection.listening.correct,
        score_reading: bySection.reading.correct,
        score_vocabulary: bySection.vocabulary.correct,
        score_grammar: bySection.grammar.correct,
        score_business: bySection.business_english.correct,
        total_listening: bySection.listening.total,
        total_reading: bySection.reading.total,
        total_vocabulary: bySection.vocabulary.total,
        total_grammar: bySection.grammar.total,
        total_business: bySection.business_english.total,
        total_correct: result.totalCorrect,
        total_questions: result.totalQuestions,
        toeic_score: result.toeicScore,
        cefr_level: result.cefr,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      toast.error("Could not save your result");
      setStep("quiz");
      return;
    }

    const answerRows = questions.map((q) => ({
      assessment_id: inserted.id,
      question_id: q.id,
      section: q.section,
      selected_answer: answers[q.id] ?? null,
      is_correct: answers[q.id] === q.correct_answer,
    }));
    await supabase.from("toeic_assessment_answers").insert(answerRows);

    navigate(`/assessments/toeic/${inserted.id}`);
  }

  const answered = useMemo(
    () => questions.every((q) => answers[q.id] != null),
    [questions, answers]
  );

  if (step === "intro") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>TOEIC Placement Test</CardTitle>
            <CardDescription>
              About 95 multiple-choice questions across 5 sections. Takes ~45 minutes. You'll
              get an estimated TOEIC score (10–990) and CEFR level (A1–C2).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Listening (20) · Reading (20)</li>
              <li>• Vocabulary (20) · Grammar (20)</li>
              <li>• Business English (15)</li>
            </ul>
            {poolEmpty && (
              <p className="text-sm text-destructive">
                The question bank is empty. Ask an admin to seed questions from Settings.
              </p>
            )}
            <Button onClick={start} disabled={poolEmpty}>
              Start test <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
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
