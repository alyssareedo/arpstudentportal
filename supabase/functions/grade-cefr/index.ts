// Server-side CEFR grading. The answer key (`correct_answer`) is NEVER shipped
// to the browser. The client submits only its selected option indexes; this
// function loads the correct answers with the service role, grades, stores the
// attempt and returns the result plus a post-submission answer review.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Category = "grammar" | "vocabulary" | "reading" | "listening";
type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface SubmittedAnswer {
  question_id: string;
  selected_answer: number | null;
}

const LEVEL_BANDS: { level: Level; min: number; name: string; description: string }[] = [
  { level: "A1", min: 0, name: "Get Started", description: "You know basic letters, words and greetings. A great starting point!" },
  { level: "A2", min: 8, name: "Basics", description: "You can talk about yourself, your family and simple situations." },
  { level: "B1", min: 14, name: "Intermediate", description: "You can tell stories, explain ideas and understand general conversations." },
  { level: "B2", min: 19, name: "Upper Intermediate", description: "You can speak fluently with native speakers and work in English." },
  { level: "C1", min: 24, name: "Advanced", description: "You are fluent in all contexts and can negotiate at a high level." },
  { level: "C2", min: 28, name: "Proficient", description: "You understand and use the language almost as a native speaker." },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // The CEFR test is public: a signed-in user is optional.
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader && !authHeader.includes(anonKey)) {
      const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const body = await req.json().catch(() => null) as
      | { answers?: SubmittedAnswer[]; intake?: Record<string, unknown> }
      | null;
    const answers = body?.answers;
    if (!Array.isArray(answers) || answers.length === 0) return json({ error: "answers required" }, 400);
    if (answers.length > 200) return json({ error: "too many answers" }, 400);

    const admin = createClient(url, serviceKey);

    // Load the whole active bank: grading must cover every question, so a client
    // cannot cherry-pick a single question to reveal its key.
    const { data: questions, error: qErr } = await admin
      .from("cefr_questions")
      .select("id, level, category, prompt, passage, options, correct_answer, explanation, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    if (qErr || !questions || questions.length === 0) return json({ error: "Could not load questions" }, 500);

    const submitted = new Map<string, number | null>();
    for (const a of answers) {
      if (typeof a?.question_id === "string") {
        const v = a.selected_answer;
        submitted.set(a.question_id, typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);
      }
    }

    // Every question must be answered before the key is revealed.
    const unanswered = questions.filter((q) => submitted.get(q.id) == null);
    if (unanswered.length > 0) {
      return json({ error: "All questions must be answered before submitting", unanswered: unanswered.length }, 400);
    }

    const breakdown: Record<Category, { correct: number; total: number }> = {
      grammar: { correct: 0, total: 0 }, vocabulary: { correct: 0, total: 0 },
      reading: { correct: 0, total: 0 }, listening: { correct: 0, total: 0 },
    };

    const review: unknown[] = [];
    const answerRows: { question_id: string; selected_answer: number | null; is_correct: boolean }[] = [];
    let total = 0;

    for (const q of questions) {
      const cat = q.category as Category;
      if (!breakdown[cat]) continue;
      breakdown[cat].total += 1;
      const selected = submitted.get(q.id) ?? null;
      const is_correct = selected != null && selected === q.correct_answer;
      if (is_correct) {
        breakdown[cat].correct += 1;
        total += 1;
      }
      answerRows.push({ question_id: q.id, selected_answer: selected, is_correct });
      const options = (q.options ?? []) as string[];
      review.push({
        question_id: q.id,
        level: q.level,
        category: q.category,
        prompt: q.prompt,
        passage: q.passage,
        options,
        selected_answer: selected,
        selected_text: selected != null ? options[selected] ?? null : null,
        correct_answer: q.correct_answer,
        correct_text: options[q.correct_answer] ?? null,
        is_correct,
        explanation: q.explanation ?? null,
      });
    }

    let band = LEVEL_BANDS[0];
    for (const lb of LEVEL_BANDS) if (total >= lb.min) band = lb;

    const intake = (body?.intake ?? {}) as Record<string, string | null>;
    const str = (k: string) => {
      const v = intake[k];
      return typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : null;
    };
    const num = (k: string) => {
      const v = intake[k];
      const n = v ? parseInt(String(v), 10) : NaN;
      return Number.isFinite(n) ? n : null;
    };

    const selectedByLegacy: Record<string, number | null> = {};
    for (const [k, v] of submitted) selectedByLegacy[k] = v;

    const { data: inserted, error: insErr } = await admin
      .from("cefr_assessments")
      .insert({
        user_id: userId,
        full_name: str("full_name") ?? "",
        age: num("age"),
        learner_type: str("learner_type"),
        filled_by: str("filled_by"),
        phone: str("phone") ?? "",
        line_id: str("line_id"),
        main_goal: str("main_goal"),
        course_interest: str("course_interest"),
        self_level: str("self_level"),
        goal_level: str("goal_level"),
        speech_confidence: num("speech_confidence"),
        urgency: str("urgency"),
        website: str("website"),
        answers: selectedByLegacy,
        score_grammar: breakdown.grammar.correct,
        score_vocabulary: breakdown.vocabulary.correct,
        score_reading: breakdown.reading.correct,
        score_listening: breakdown.listening.correct,
        total_score: total,
        total_questions: questions.length,
        cefr_level: band.level,
      })
      .select("id")
      .single();
    if (insErr || !inserted) return json({ error: insErr?.message ?? "save failed" }, 500);

    await admin.from("cefr_assessment_answers").insert(
      answerRows.map((r) => ({ ...r, assessment_id: inserted.id })),
    );

    return json({
      assessment_id: inserted.id,
      level: band.level,
      name: band.name,
      description: band.description,
      total,
      total_questions: questions.length,
      breakdown,
      review,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
