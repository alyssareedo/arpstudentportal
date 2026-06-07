export type ToeicSection =
  | "listening"
  | "reading"
  | "vocabulary"
  | "grammar"
  | "business_english";

export const SECTION_LABELS: Record<ToeicSection, string> = {
  listening: "Listening",
  reading: "Reading",
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  business_english: "Business English",
};

export interface SectionScore {
  section: ToeicSection;
  correct: number;
  total: number;
  percent: number;
}

export interface ToeicResult {
  sections: SectionScore[];
  totalCorrect: number;
  totalQuestions: number;
  toeicScore: number;
  cefr: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  strengths: ToeicSection[];
  weaknesses: ToeicSection[];
  recommendations: string;
}

/** Map % correct (0-1) linearly into a TOEIC half-band (5-495). */
function toHalfBand(pct: number): number {
  const raw = 5 + pct * 490;
  return Math.round(raw / 5) * 5;
}

export function calculateToeic(sections: SectionScore[]): ToeicResult {
  const map = Object.fromEntries(
    sections.map((s) => [s.section, s.percent])
  ) as Record<ToeicSection, number>;

  // Composite nudge from supporting sections
  const supportAvg =
    ((map.vocabulary ?? 0) + (map.grammar ?? 0) + (map.business_english ?? 0)) / 3;

  // Listening band influenced lightly by vocab + business
  const listeningPct =
    0.75 * (map.listening ?? 0) +
    0.15 * (map.vocabulary ?? 0) +
    0.1 * (map.business_english ?? 0);
  // Reading band influenced by grammar + vocab
  const readingPct =
    0.7 * (map.reading ?? 0) +
    0.2 * (map.grammar ?? 0) +
    0.1 * (map.vocabulary ?? 0);

  // Tiny nudge from overall support so high-support students aren't penalised
  const listeningBand = toHalfBand(Math.min(1, listeningPct * 0.95 + supportAvg * 0.05));
  const readingBand = toHalfBand(Math.min(1, readingPct * 0.95 + supportAvg * 0.05));

  const toeicScore = Math.max(10, Math.min(990, listeningBand + readingBand));

  let cefr: ToeicResult["cefr"] = "A1";
  if (toeicScore >= 990) cefr = "C2";
  else if (toeicScore >= 945) cefr = "C1";
  else if (toeicScore >= 785) cefr = "B2";
  else if (toeicScore >= 550) cefr = "B1";
  else if (toeicScore >= 225) cefr = "A2";

  const sorted = [...sections].sort((a, b) => b.percent - a.percent);
  const strengths = sorted.slice(0, 2).map((s) => s.section);
  const weaknesses = sorted.slice(-2).map((s) => s.section).reverse();

  const totalCorrect = sections.reduce((sum, s) => sum + s.correct, 0);
  const totalQuestions = sections.reduce((sum, s) => sum + s.total, 0);

  const recTexts: Record<ToeicSection, string> = {
    listening:
      "Practise short conversations and announcements daily. Try podcasts at 0.9x speed and shadow-repeat phrases.",
    reading:
      "Read short business emails and articles daily, then summarise them in one sentence. Time yourself.",
    vocabulary:
      "Learn 10 high-frequency TOEIC words per day with example sentences. Use spaced repetition.",
    grammar:
      "Drill verb tenses, prepositions and conjunctions with short exercises. Focus on the patterns you missed.",
    business_english:
      "Study meeting, email and travel vocabulary. Practise polite requests and indirect questions.",
  };

  const recommendations = weaknesses.map((s) => `• ${SECTION_LABELS[s]}: ${recTexts[s]}`).join("\n");

  return {
    sections,
    totalCorrect,
    totalQuestions,
    toeicScore,
    cefr,
    strengths,
    weaknesses,
    recommendations,
  };
}

/** Fisher-Yates shuffle */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick up to `n` items per section, shuffled. */
export function pickQuestions<T extends { section: ToeicSection }>(
  pool: T[],
  perSection: Partial<Record<ToeicSection, number>>
): T[] {
  const out: T[] = [];
  (Object.keys(perSection) as ToeicSection[]).forEach((sec) => {
    const limit = perSection[sec] ?? 0;
    const bucket = shuffle(pool.filter((q) => q.section === sec));
    out.push(...bucket.slice(0, limit));
  });
  return out;
}
