// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SECTIONS: { section: string; count: number; brief: string }[] = [
  { section: "listening", count: 20, brief: "Short conversation transcripts (2-4 lines) followed by a comprehension question. Provide the transcript inside the prompt." },
  { section: "reading", count: 25, brief: "Short business email / notice / article (60-120 words) followed by a comprehension question. Include the passage in the prompt." },
  { section: "vocabulary", count: 20, brief: "Fill-in-the-blank sentence testing common TOEIC vocabulary." },
  { section: "grammar", count: 20, brief: "Fill-in-the-blank sentence testing grammar (tense, preposition, article, etc.)." },
  { section: "business_english", count: 15, brief: "Workplace situation (meetings, emails, travel, presentations) with a comprehension or best-response question." },
];

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

interface Generated {
  prompt: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  difficulty?: string;
}

async function generateBatch(section: string, brief: string, count: number, apiKey: string): Promise<Generated[]> {
  const systemPrompt = `You are an expert TOEIC test writer. Produce exam-quality multiple-choice questions. Respond ONLY by calling the provided tool.`;
  const userPrompt = `Generate ${count} TOEIC-style ${section.toUpperCase()} questions. ${brief}
Spread difficulty roughly evenly across beginner, intermediate, advanced.
Each question MUST have exactly 4 options. correct_answer MUST be one of the 4 option strings (exact match).`;

  const tool = {
    type: "function",
    function: {
      name: "submit_questions",
      description: "Submit the generated questions.",
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                prompt: { type: "string" },
                options: { type: "array", items: { type: "string" } },
                correct_answer: { type: "string" },
                explanation: { type: "string" },
                difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
              },
              required: ["prompt", "options", "correct_answer", "difficulty"],
            },
          },
        },
        required: ["questions"],
      },
    },
  };

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "submit_questions" } },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t}`);
  }
  const data = await resp.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No tool call returned");
  const args = JSON.parse(call.function.arguments);
  return (args.questions || []).filter(
    (q: Generated) => q.options?.length === 4 && q.options.includes(q.correct_answer)
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Auth: only admins
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inserted: Record<string, number> = {};
    for (const s of SECTIONS) {
      try {
        const generated = await generateBatch(s.section, s.brief, s.count, apiKey);
        if (generated.length === 0) {
          inserted[s.section] = 0;
          continue;
        }
        const rows = generated.map((g) => ({
          section: s.section,
          difficulty: (DIFFICULTIES as readonly string[]).includes(g.difficulty ?? "")
            ? g.difficulty
            : "intermediate",
          prompt: g.prompt,
          options: g.options,
          correct_answer: g.correct_answer,
          explanation: g.explanation ?? null,
        }));
        const { error } = await admin.from("toeic_questions").insert(rows);
        if (error) throw error;
        inserted[s.section] = rows.length;
      } catch (e) {
        inserted[s.section] = 0;
        console.error(`Section ${s.section} failed:`, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("seed-toeic-questions error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
