import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

interface QuestionRow {
  id: string;
  level: string;
  category: string;
  prompt: string;
  passage: string | null;
  options: unknown;
  correct_answer: number;
  explanation: string | null;
  sort_order: number;
}

/** Admin/teacher-only CEFR answer key. Reads public.cefr_questions directly,
 *  which RLS restricts to staff. */
export function CefrAnswerKey() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || rows.length) return;
    setLoading(true);
    supabase
      .from("cefr_questions")
      .select("id, level, category, prompt, passage, options, correct_answer, explanation, sort_order")
      .order("sort_order")
      .then(({ data, error }) => {
        if (error) toast.error("Could not load the CEFR answer key");
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
            <KeyRound className="h-4 w-4" /> CEFR answer key
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
                      <div className="font-medium text-sm">{i + 1}. {q.prompt}</div>
                      <div className="flex gap-2 shrink-0">
                        <Badge variant="outline">{q.level}</Badge>
                        <Badge variant="secondary" className="capitalize">{q.category}</Badge>
                      </div>
                    </div>
                    {q.passage && (
                      <div className="rounded border bg-muted/40 p-2 text-xs italic">{q.passage}</div>
                    )}
                    <ul className="text-sm space-y-1">
                      {options.map((opt, idx) => (
                        <li
                          key={idx}
                          className={idx === q.correct_answer ? "font-semibold text-emerald-600" : "text-muted-foreground"}
                        >
                          {String.fromCharCode(65 + idx)}. {opt}
                          {idx === q.correct_answer ? " ✓" : ""}
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs">
                      {q.explanation ? (
                        <span className="text-muted-foreground"><span className="font-medium text-foreground">Explanation: </span>{q.explanation}</span>
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
