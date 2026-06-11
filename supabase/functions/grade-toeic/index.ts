// Server-side TOEIC grading. The answer key (`correct_answer`) is NEVER sent
// to the client. The client submits its selected answers; this function looks
// up the correct answers via the service role, grades, and persists results.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ToeicSection =
  | "listening" | "reading" | "vocabulary" | "grammar" | "business_english";

interface SubmittedAnswer {
  question_id: string;
  selected_answer: string | null;
}

function toHalfBand(pct: number): number {
  const raw = 5 + pct * 490;
  return Math.round(raw / 5) * 5;
}

const SECTION_LABELS: Record<ToeicSection, string> = {
  listening: "Listening", reading: "Reading", vocabulary: "Vocabulary",
  grammar: "Grammar", business_english: "Business English",
};

const RECS: Record<ToeicSection, string> = {
  listening: "Practise short conversations and announcements daily. Try podcasts at 0.9x speed and shadow-repeat phrases.",
  reading: "Read short business emails and articles daily, then summarise them in one sentence. Time yourself.",
  vocabulary: "Learn 10 high-frequency TOEIC words per day with example sentences. Use spaced repetition.",
  grammar: "Drill verb tenses, prepositions and conjunctions with short exercises. Focus on the patterns you missed.",
  business_english: "Study meeting, email and travel vocabulary. Practise polite requests and indirect questions.",
};

function score(sections: { section: ToeicSection; correct: number; total: number; percent: number }[]) {
  const map = Object.fromEntries(sections.map((s) => [s.section, s.percent])) as Record<ToeicSection, number>;
  const supportAvg = ((map.vocabulary ?? 0) + (map.grammar ?? 0) + (map.business_english ?? 0)) / 3;
  const listeningPct = 0.75 * (map.listening ?? 0) + 0.15 * (map.vocabulary ?? 0) + 0.1 * (map.business_english ?? 0);
  const readingPct = 0.7 * (map.reading ?? 0) + 0.2 * (map.grammar ?? 0) + 0.1 * (map.vocabulary ?? 0);
  const lBand = toHalfBand(Math.min(1, listeningPct * 0.95 + supportAvg * 0.05));
  const rBand = toHalfBand(Math.min(1, readingPct * 0.95 + supportAvg * 0.05));
  const toeicScore = Math.max(10, Math.min(990, lBand + rBand));
  let cefr: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" = "A1";
  if (toeicScore >= 990) cefr = "C2";
  else if (toeicScore >= 945) cefr = "C1";
  else if (toeicScore >= 785) cefr = "B2";
  else if (toeicScore >= 550) cefr = "B1";
  else if (toeicScore >= 225) cefr = "A2";
  const sorted = [...sections].sort((a, b) => b.percent - a.percent);
  const strengths = sorted.slice(0, 2).map((s) => s.section);
  const weaknesses = sorted.slice(-2).map((s) => s.section).reverse();
  const recommendations = weaknesses.map((s) => `• ${SECTION_LABELS[s]}: ${RECS[s]}`).join("\n");
  return { toeicScore, cefr, strengths, weaknesses, recommendations };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: ud, error: ue } = await userClient.auth.getUser();
    if (ue || !ud.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { answers } = await req.json() as { answers: SubmittedAnswer[] };
    if (!Array.isArray(answers) || answers.length === 0) {
      return new Response(JSON.stringify({ error: "answers required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (answers.length > 500) {
      return new Response(JSON.stringify({ error: "too many answers" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(url, serviceKey);
    const ids = answers.map((a) => a.question_id);
    const { data: questions, error: qErr } = await admin
      .from("toeic_questions")
      .select("id, section, correct_answer")
      .in("id", ids);
    if (qErr || !questions) {
      return new Response(JSON.stringify({ error: "Could not load questions" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const byId = new Map(questions.map((q) => [q.id, q]));

    const bySection: Record<ToeicSection, { correct: number; total: number }> = {
      listening: { correct: 0, total: 0 },
      reading: { correct: 0, total: 0 },
      vocabulary: { correct: 0, total: 0 },
      grammar: { correct: 0, total: 0 },
      business_english: { correct: 0, total: 0 },
    };

    const answerRows: any[] = [];
    for (const a of answers) {
      const q = byId.get(a.question_id);
      if (!q) continue;
      const sec = q.section as ToeicSection;
      bySection[sec].total += 1;
      const is_correct = a.selected_answer != null && a.selected_answer === q.correct_answer;
      if (is_correct) bySection[sec].correct += 1;
      answerRows.push({
        question_id: q.id,
        section: sec,
        selected_answer: a.selected_answer,
        is_correct,
      });
    }

    const sectionScores = (Object.keys(bySection) as ToeicSection[])
      .filter((s) => bySection[s].total > 0)
      .map((s) => ({
        section: s,
        correct: bySection[s].correct,
        total: bySection[s].total,
        percent: bySection[s].correct / bySection[s].total,
      }));
    const totalCorrect = sectionScores.reduce((sum, s) => sum + s.correct, 0);
    const totalQuestions = sectionScores.reduce((sum, s) => sum + s.total, 0);
    const result = score(sectionScores);

    const { data: inserted, error: insErr } = await admin
      .from("toeic_assessments")
      .insert({
        student_id: ud.user.id,
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
        total_correct: totalCorrect,
        total_questions: totalQuestions,
        toeic_score: result.toeicScore,
        cefr_level: result.cefr,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        recommendations: result.recommendations,
      })
      .select("id")
      .single();
    if (insErr || !inserted) {
      return new Response(JSON.stringify({ error: insErr?.message ?? "save failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("toeic_assessment_answers").insert(
      answerRows.map((r) => ({ ...r, assessment_id: inserted.id })),
    );

    return new Response(JSON.stringify({ assessment_id: inserted.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
