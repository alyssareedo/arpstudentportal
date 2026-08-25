import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, ArrowLeft, MessageSquarePlus } from "lucide-react";
import { SECTION_LABELS, type ToeicSection } from "@/lib/toeic-scoring";
import { generateToeicReport } from "@/lib/toeic-pdf";

interface Assessment {
  id: string;
  student_id: string;
  completed_at: string | null;
  created_at: string;
  toeic_score: number;
  cefr_level: string | null;
  total_correct: number;
  total_questions: number;
  score_listening: number;
  score_reading: number;
  score_vocabulary: number;
  score_grammar: number;
  score_business: number;
  total_listening: number;
  total_reading: number;
  total_vocabulary: number;
  total_grammar: number;
  total_business: number;
  strengths: ToeicSection[] | null;
  weaknesses: ToeicSection[] | null;
  recommendations: string | null;
}

interface Profile {
  full_name: string;
  email: string;
}

interface Comment {
  id: string;
  body: string;
  author_id: string;
  created_at: string;
  author_name?: string;
}

interface ReviewRow {
  question_id: string;
  section: ToeicSection;
  prompt: string;
  options: string[];
  selected_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  explanation: string | null;
}


export default function ToeicResult() {
  const { id } = useParams();
  const { user, role } = useAuth();
  const [a, setA] = useState<Assessment | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [review, setReview] = useState<ReviewRow[]>([]);


  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: assess } = await supabase
        .from("toeic_assessments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!assess) {
        setLoading(false);
        return;
      }
      setA(assess as unknown as Assessment);

      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", (assess as { student_id: string }).student_id)
        .maybeSingle();
      setProfile(prof as Profile | null);

      if (isStaff || (user && user.id === (assess as { student_id: string }).student_id)) {
        const { data: cs } = await supabase
          .from("assessment_comments")
          .select("id, body, author_id, created_at")
          .eq("assessment_id", id)
          .eq("assessment_type", "toeic")
          .order("created_at", { ascending: true });
        if (cs && cs.length > 0) {
          const authorIds = Array.from(new Set(cs.map((c) => c.author_id)));
          const { data: authors } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", authorIds);
          const map = new Map((authors ?? []).map((p) => [p.id, p.full_name]));
          setComments(
            cs.map((c) => ({ ...c, author_name: map.get(c.author_id) ?? "Staff" }))
          );
        } else {
          setComments([]);
        }
      }
      setLoading(false);
    })();
  }, [id, user, isStaff]);

  async function addComment() {
    if (!user || !id || !newComment.trim()) return;
    const { data, error } = await supabase
      .from("assessment_comments")
      .insert({
        assessment_type: "toeic",
        assessment_id: id,
        author_id: user.id,
        body: newComment.trim(),
      })
      .select("id, body, author_id, created_at")
      .single();
    if (error) {
      toast.error("Could not add comment");
      return;
    }
    setComments((cs) => [...cs, { ...data, author_name: "You" }]);
    setNewComment("");
    toast.success("Comment added");
  }

  async function download() {
    if (!a) return;
    const sections = [
      { section: "listening" as ToeicSection, correct: a.score_listening, total: a.total_listening },
      { section: "reading" as ToeicSection, correct: a.score_reading, total: a.total_reading },
      { section: "vocabulary" as ToeicSection, correct: a.score_vocabulary, total: a.total_vocabulary },
      { section: "grammar" as ToeicSection, correct: a.score_grammar, total: a.total_grammar },
      { section: "business_english" as ToeicSection, correct: a.score_business, total: a.total_business },
    ]
      .filter((s) => s.total > 0)
      .map((s) => ({ ...s, percent: s.correct / s.total }));

    await generateToeicReport({
      studentName: profile?.full_name ?? "Student",
      studentEmail: profile?.email,
      completedAt: a.completed_at ?? a.created_at,
      toeicScore: a.toeic_score,
      cefr: a.cefr_level ?? "—",
      totalCorrect: a.total_correct,
      totalQuestions: a.total_questions,
      sections,
      strengths: a.strengths ?? [],
      weaknesses: a.weaknesses ?? [],
      recommendations: a.recommendations ?? "",
      teacherComments: comments.map((c) => ({
        author: c.author_name ?? "Staff",
        body: c.body,
        created_at: c.created_at,
      })),
    });
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!a) return <p className="text-sm text-muted-foreground">Result not found.</p>;

  const sections = [
    { key: "listening" as ToeicSection, c: a.score_listening, t: a.total_listening },
    { key: "reading" as ToeicSection, c: a.score_reading, t: a.total_reading },
    { key: "vocabulary" as ToeicSection, c: a.score_vocabulary, t: a.total_vocabulary },
    { key: "grammar" as ToeicSection, c: a.score_grammar, t: a.total_grammar },
    { key: "business_english" as ToeicSection, c: a.score_business, t: a.total_business },
  ].filter((s) => s.t > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to={isStaff ? "/admin/assessments" : "/assessments"}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Link>
      </Button>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/15 to-emerald-500/10 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">TOEIC Placement Test</p>
              <p className="text-4xl font-bold text-primary">{a.toeic_score} <span className="text-base font-normal text-muted-foreground">/ 990</span></p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(a.completed_at ?? a.created_at).toLocaleString()}
                {profile ? ` · ${profile.full_name}` : ""}
              </p>
            </div>
            <div className="text-right">
              <Badge className="text-base">CEFR {a.cefr_level}</Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                {a.total_correct} / {a.total_questions} correct
              </p>
            </div>
          </div>
        </div>
        <CardContent className="space-y-4 pt-6">
          {sections.map((s) => {
            const pct = Math.round((s.c / s.t) * 100);
            return (
              <div key={s.key} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{SECTION_LABELS[s.key]}</span>
                  <span className="text-muted-foreground">{s.c}/{s.t} · {pct}%</span>
                </div>
                <Progress value={pct} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base text-emerald-600">Strengths</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {(a.strengths ?? []).map((s) => <p key={s}>• {SECTION_LABELS[s]}</p>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base text-pink-600">Areas to improve</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {(a.weaknesses ?? []).map((s) => <p key={s}>• {SECTION_LABELS[s]}</p>)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recommended study plan</CardTitle></CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {a.recommendations || "Keep practising!"}
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={download}>
          <Download className="mr-2 h-4 w-4" /> Download PDF report
        </Button>
      </div>

      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4" /> Teacher comments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="rounded-md border p-3 text-sm">
                <div className="mb-1 text-xs text-muted-foreground">
                  {c.author_name} · {new Date(c.created_at).toLocaleString()}
                </div>
                <p className="whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
            <Textarea
              placeholder="Add a comment or study recommendation…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <Button onClick={addComment} disabled={!newComment.trim()} size="sm">
              Add comment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
