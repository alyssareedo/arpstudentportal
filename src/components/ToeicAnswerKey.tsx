import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { SECTION_LABELS, type ToeicSection } from "@/lib/toeic-scoring";

interface QuestionRow {
  id: string;
  section: ToeicSection;
  difficulty: string;
  prompt: string;
  options: unknown;
  correct_answer: string;
  explanation: string | null;
}

/** Admin/teacher-only TOEIC answer key. Reads public.toeic_questions directly,
 *  which RLS restricts to staff. */
export function ToeicAnswerKey() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || rows.length) return;
    setLoading(true);
    supabase
      .from("toeic_questions")
      .select("id, section, difficulty, prompt, options, correct_answer, explanation")
      .order("section")
      .then(({ data, error }) => {
        if (error) toast.error("Could not load the TOEIC answer key");
        else setRows((data ?? []) as QuestionRow[]);
        setLoading(false);
      });
  }, [open, rows.length]);

  const missing = rows.filter((r) => !r.explanation).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> TOEIC answer key
          </CardTitle>
          <p className="text-xs text-muted-foreground">Visible to admins and teachers only.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide" : "Show"}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions found.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {rows.length} questions · {missing} without an explanation
              </p>
              {rows.map((q, i) => {
                const options = (Array.isArray(q.options) ? q.options : []) as string[];
                return (
                  <div key={q.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-medium">{i + 1}. {q.prompt}</div>
                      <div className="flex shrink-0 gap-2">
                        <Badge variant="outline">{SECTION_LABELS[q.section] ?? q.section}</Badge>
                        <Badge variant="secondary" className="capitalize">{q.difficulty}</Badge>
                      </div>
                    </div>
                    <ul className="space-y-1 text-sm">
                      {options.map((opt, idx) => {
                        const isCorrect = opt === q.correct_answer;
                        return (
                          <li
                            key={idx}
                            className={isCorrect ? "font-semibold text-emerald-600" : "text-muted-foreground"}
                          >
                            {String.fromCharCode(65 + idx)}. {opt}
                            {isCorrect ? " ✓" : ""}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="text-xs">
                      {q.explanation ? (
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground">Explanation: </span>
                          {q.explanation}
                        </span>
                      ) : (
                        <span className="text-amber-600">No explanation yet</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
