import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, GraduationCap, Clock, Award, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

type Category = "grammar" | "vocabulary" | "reading" | "listening";
type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface Question {
  id: number;
  category: Category;
  level: Level;
  question: string;
  passage?: string;
  options: string[];
  answer: number;
}

const QUESTIONS: Question[] = [
  // A1 - Grammar / Vocab
  { id: 1, category: "grammar", level: "A1", question: "___ name is John.", options: ["I", "My", "Me", "Mine"], answer: 1 },
  { id: 2, category: "vocabulary", level: "A1", question: "What colour is the sky on a clear day?", options: ["Red", "Green", "Blue", "Yellow"], answer: 2 },
  { id: 3, category: "grammar", level: "A1", question: "She ___ a teacher.", options: ["am", "is", "are", "be"], answer: 1 },
  { id: 4, category: "reading", level: "A1", question: "\"Hello, I'm Anna. I'm from Italy.\" Where is Anna from?", options: ["Spain", "Italy", "France", "Germany"], answer: 1 },
  { id: 5, category: "listening", level: "A1", question: "Which is a greeting?", options: ["Goodbye", "Hello", "Sorry", "Please"], answer: 1 },

  // A2
  { id: 6, category: "grammar", level: "A2", question: "Choose the correct sentence:", options: ["She don't like coffee.", "She doesn't likes coffee.", "She doesn't like coffee.", "She no like coffee."], answer: 2 },
  { id: 7, category: "vocabulary", level: "A2", question: "I usually ___ to work by bus.", options: ["go", "going", "goes", "went"], answer: 0 },
  { id: 8, category: "grammar", level: "A2", question: "Yesterday I ___ to the cinema.", options: ["go", "going", "went", "gone"], answer: 2 },
  { id: 9, category: "reading", level: "A2", question: "\"The shop opens at 9am and closes at 6pm.\" How many hours is it open?", options: ["6", "8", "9", "10"], answer: 2 },
  { id: 10, category: "listening", level: "A2", question: "\"Could you repeat that, please?\" The speaker wants you to:", options: ["Speak louder", "Say it again", "Stop talking", "Translate"], answer: 1 },

  // B1
  { id: 11, category: "grammar", level: "B1", question: "The weather is ___ today than yesterday.", options: ["cold", "colder", "more cold", "coldest"], answer: 1 },
  { id: 12, category: "vocabulary", level: "B1", question: "I'm looking ___ to meeting you.", options: ["at", "for", "forward", "up"], answer: 2 },
  { id: 13, category: "grammar", level: "B1", question: "If it rains tomorrow, we ___ stay home.", options: ["will", "would", "are", "have"], answer: 0 },
  { id: 14, category: "reading", level: "B1", question: "\"Please switch off your phone before the meeting starts.\" What should you do?", options: ["Call someone", "Turn off the phone", "Send a message", "Charge it"], answer: 1 },
  { id: 15, category: "listening", level: "B1", question: "\"I'd rather not go out tonight.\" The speaker:", options: ["Wants to go out", "Prefers to stay in", "Is already out", "Is asking a question"], answer: 1 },

  // B2
  { id: 16, category: "grammar", level: "B2", question: "By the time you arrive, I ___ dinner.", options: ["cook", "cooked", "will have cooked", "am cooking"], answer: 2 },
  { id: 17, category: "vocabulary", level: "B2", question: "Her arguments were very ___ and convinced everyone.", options: ["weak", "compelling", "boring", "confused"], answer: 1 },
  { id: 18, category: "grammar", level: "B2", question: "He suggested ___ a new approach.", options: ["to try", "try", "trying", "tried"], answer: 2 },
  {
    id: 19, category: "reading", level: "B2",
    passage: "Although coffee was once thought to be harmful, recent studies suggest that moderate consumption may have health benefits, including improved alertness and reduced risk of certain diseases.",
    question: "What is the main idea?",
    options: ["Coffee is harmful to health", "Coffee may have some health benefits", "Everyone should drink coffee", "Coffee causes diseases"], answer: 1
  },
  { id: 20, category: "listening", level: "B2", question: "\"I couldn't agree with you more.\" The speaker:", options: ["Strongly agrees", "Strongly disagrees", "Is unsure", "Wants more information"], answer: 0 },

  // C1
  { id: 21, category: "grammar", level: "C1", question: "Had I known earlier, I ___ differently.", options: ["would act", "will act", "would have acted", "had acted"], answer: 2 },
  { id: 22, category: "vocabulary", level: "C1", question: "The findings ___ doubt on the original theory.", options: ["throw", "cast", "put", "lay"], answer: 1 },
  { id: 23, category: "grammar", level: "C1", question: "Not only ___ late, but he also forgot the documents.", options: ["he was", "was he", "he is", "is he"], answer: 1 },
  {
    id: 24, category: "reading", level: "C1",
    passage: "While the proposal has been widely lauded by industry experts, its implementation hinges on overcoming several entrenched regulatory hurdles.",
    question: "The proposal is:",
    options: ["Already implemented", "Praised but faces challenges", "Rejected by experts", "A regulatory failure"], answer: 1
  },
  { id: 25, category: "listening", level: "C1", question: "\"That's a moot point.\" It means the point is:", options: ["Very important", "Debatable or irrelevant", "Clearly true", "Funny"], answer: 1 },

  // C2
  { id: 26, category: "grammar", level: "C2", question: "Seldom ___ such craftsmanship in modern furniture.", options: ["you see", "do you see", "you do see", "have you saw"], answer: 1 },
  { id: 27, category: "vocabulary", level: "C2", question: "His remarks were widely seen as ___ — clever but unkind.", options: ["earnest", "facetious", "sycophantic", "magnanimous"], answer: 1 },
  { id: 28, category: "grammar", level: "C2", question: "Were it not ___ your support, we would have failed.", options: ["for", "to", "by", "of"], answer: 0 },
  {
    id: 29, category: "reading", level: "C2",
    passage: "The author's prose, ostensibly straightforward, conceals layers of irony that only careful re-reading uncovers.",
    question: "The author's writing is:",
    options: ["Simple and clear", "Apparently simple but deeply ironic", "Confusing and badly written", "Overtly sarcastic"], answer: 1
  },
  { id: 30, category: "listening", level: "C2", question: "\"He's hoist with his own petard.\" This idiom means he:", options: ["Won a battle", "Is harmed by his own scheme", "Is very lucky", "Got promoted"], answer: 1 },
];

const LEVEL_BANDS: { level: Level; min: number; name: string; description: string }[] = [
  { level: "A1", min: 0, name: "Get Started", description: "You know basic letters, words and greetings. A great starting point!" },
  { level: "A2", min: 8, name: "Basics", description: "You can talk about yourself, your family and simple situations." },
  { level: "B1", min: 14, name: "Intermediate", description: "You can tell stories, explain ideas and understand general conversations." },
  { level: "B2", min: 19, name: "Upper Intermediate", description: "You can speak fluently with native speakers and work in English." },
  { level: "C1", min: 24, name: "Advanced", description: "You are fluent in all contexts and can negotiate at a high level." },
  { level: "C2", min: 28, name: "Proficient", description: "You understand and use the language almost as a native speaker." },
];

type Step = "intake" | "quiz" | "result";

const initialIntake = {
  full_name: "", age: "", learner_type: "", filled_by: "", phone: "", line_id: "",
  main_goal: "", course_interest: "", self_level: "", goal_level: "",
  speech_confidence: "", urgency: "", website: "",
};

export default function CefrTest() {
  const [step, setStep] = useState<Step>("intake");
  const [intake, setIntake] = useState(initialIntake);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [qIndex, setQIndex] = useState(0);
  const [result, setResult] = useState<{ level: Level; name: string; description: string; total: number; breakdown: Record<Category, { correct: number; total: number }> } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setIntakeField = (k: keyof typeof intake, v: string) => setIntake((s) => ({ ...s, [k]: v }));

  const intakeValid = intake.full_name.trim() && intake.phone.trim() && intake.learner_type && intake.main_goal && intake.speech_confidence;

  const current = QUESTIONS[qIndex];
  const progress = ((qIndex + (answers[current?.id] !== undefined ? 1 : 0)) / QUESTIONS.length) * 100;

  const breakdown = useMemo(() => {
    const b: Record<Category, { correct: number; total: number }> = {
      grammar: { correct: 0, total: 0 }, vocabulary: { correct: 0, total: 0 },
      reading: { correct: 0, total: 0 }, listening: { correct: 0, total: 0 },
    };
    for (const q of QUESTIONS) {
      b[q.category].total += 1;
      if (answers[q.id] === q.answer) b[q.category].correct += 1;
    }
    return b;
  }, [answers]);

  async function finish() {
    setSubmitting(true);
    let total = 0;
    for (const q of QUESTIONS) if (answers[q.id] === q.answer) total += 1;
    let band = LEVEL_BANDS[0];
    for (const lb of LEVEL_BANDS) if (total >= lb.min) band = lb;
    const res = { level: band.level, name: band.name, description: band.description, total, breakdown };
    setResult(res);

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cefr_assessments").insert({
      user_id: user?.id ?? null,
      full_name: intake.full_name,
      age: intake.age ? parseInt(intake.age) : null,
      learner_type: intake.learner_type || null,
      filled_by: intake.filled_by || null,
      phone: intake.phone,
      line_id: intake.line_id || null,
      main_goal: intake.main_goal || null,
      course_interest: intake.course_interest || null,
      self_level: intake.self_level || null,
      goal_level: intake.goal_level || null,
      speech_confidence: intake.speech_confidence ? parseInt(intake.speech_confidence) : null,
      urgency: intake.urgency || null,
      website: intake.website || null,
      answers: answers as any,
      score_grammar: breakdown.grammar.correct,
      score_vocabulary: breakdown.vocabulary.correct,
      score_reading: breakdown.reading.correct,
      score_listening: breakdown.listening.correct,
      total_score: total,
      total_questions: QUESTIONS.length,
      cefr_level: band.level,
    });
    if (error) toast.error("Could not save your result, but here it is!");
    else toast.success("Result saved! We'll be in touch on LINE within 24 hours.");
    setStep("result");
    setSubmitting(false);
  }

  function next() {
    if (answers[current.id] === undefined) {
      toast.error("Please choose an answer");
      return;
    }
    if (qIndex < QUESTIONS.length - 1) setQIndex(qIndex + 1);
    else finish();
  }

  function restart() {
    setStep("intake");
    setIntake(initialIntake);
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
        {step === "intake" && (
          <>
            <section className="text-center mb-10">
              <Badge variant="secondary" className="mb-4">100% Free · Worth 500.-</Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Free CEFR English Level Test
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Discover your English level (A1–C2) in just 10–15 minutes. Get a personalised study plan delivered to LINE within 24 hours.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-sm">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 30 questions</div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> 10–15 minutes</div>
                <div className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" /> Instant CEFR result</div>
                <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" /> 1-on-1 follow-up</div>
              </div>
            </section>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Your information</CardTitle>
                <p className="text-sm text-muted-foreground">Fill this in so we can tailor your results. Fields with * are required.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Name *</Label>
                    <Input id="full_name" value={intake.full_name} onChange={(e) => setIntakeField("full_name", e.target.value)} placeholder="Your full name" />
                  </div>
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" type="number" value={intake.age} onChange={(e) => setIntakeField("age", e.target.value)} placeholder="Age of learner" />
                  </div>
                  <div>
                    <Label>Learner type *</Label>
                    <Select value={intake.learner_type} onValueChange={(v) => setIntakeField("learner_type", v)}>
                      <SelectTrigger><SelectValue placeholder="-- Select --" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kid">Kid</SelectItem>
                        <SelectItem value="teen">Teen</SelectItem>
                        <SelectItem value="adult">Adult</SelectItem>
                        <SelectItem value="professional">Working Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Filling in</Label>
                    <Select value={intake.filled_by} onValueChange={(v) => setIntakeField("filled_by", v)}>
                      <SelectTrigger><SelectValue placeholder="-- Select --" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="self">Myself</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="other">Someone else</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone *</Label>
                    <Input id="phone" value={intake.phone} onChange={(e) => setIntakeField("phone", e.target.value)} placeholder="Phone number" />
                  </div>
                  <div>
                    <Label htmlFor="line_id">LINE ID</Label>
                    <Input id="line_id" value={intake.line_id} onChange={(e) => setIntakeField("line_id", e.target.value)} placeholder="@yourlineid" />
                  </div>
                  <div>
                    <Label>Main goal *</Label>
                    <Select value={intake.main_goal} onValueChange={(v) => setIntakeField("main_goal", v)}>
                      <SelectTrigger><SelectValue placeholder="-- Select --" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conversation">Daily conversation</SelectItem>
                        <SelectItem value="work">Work / Business</SelectItem>
                        <SelectItem value="exam">Exam prep (IELTS/TOEFL/TOEIC)</SelectItem>
                        <SelectItem value="travel">Travel</SelectItem>
                        <SelectItem value="study">Study abroad</SelectItem>
                        <SelectItem value="kids">Kids / School</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Courses of interest</Label>
                    <Select value={intake.course_interest} onValueChange={(v) => setIntakeField("course_interest", v)}>
                      <SelectTrigger><SelectValue placeholder="If unsure, leave blank" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General English</SelectItem>
                        <SelectItem value="business">Business English</SelectItem>
                        <SelectItem value="conversation">Conversation</SelectItem>
                        <SelectItem value="ielts">IELTS Prep</SelectItem>
                        <SelectItem value="kids">Kids Course</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Self-assessed level</Label>
                    <Select value={intake.self_level} onValueChange={(v) => setIntakeField("self_level", v)}>
                      <SelectTrigger><SelectValue placeholder="-- Select --" /></SelectTrigger>
                      <SelectContent>
                        {["A1","A2","B1","B2","C1","C2"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Goal level</Label>
                    <Select value={intake.goal_level} onValueChange={(v) => setIntakeField("goal_level", v)}>
                      <SelectTrigger><SelectValue placeholder="-- Select --" /></SelectTrigger>
                      <SelectContent>
                        {["A2","B1","B2","C1","C2"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Speech confidence (1–6) *</Label>
                    <Select value={intake.speech_confidence} onValueChange={(v) => setIntakeField("speech_confidence", v)}>
                      <SelectTrigger><SelectValue placeholder="-- Select --" /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6].map(n => <SelectItem key={n} value={String(n)}>{n} — {["Very shy","Shy","OK","Confident","Very confident","Native-like"][n-1]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Urgency</Label>
                    <Select value={intake.urgency} onValueChange={(v) => setIntakeField("urgency", v)}>
                      <SelectTrigger><SelectValue placeholder="-- Select --" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asap">As soon as possible</SelectItem>
                        <SelectItem value="1m">Within 1 month</SelectItem>
                        <SelectItem value="3m">Within 3 months</SelectItem>
                        <SelectItem value="exploring">Just exploring</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="website">Website / where you heard about us</Label>
                    <Input id="website" value={intake.website} onChange={(e) => setIntakeField("website", e.target.value)} placeholder="Optional" />
                  </div>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground">
                  This assessment is a preliminary placement for course recommendations, not an official exam transcript.
                </div>
                <Button size="lg" className="w-full" disabled={!intakeValid} onClick={() => setStep("quiz")}>
                  Start Quiz <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <section className="mt-12 grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>What is CEFR?</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>CEFR (Common European Framework of Reference for Languages) is an international standard for measuring English proficiency, divided into 6 levels — A1 (beginner) to C2 (near-native).</p>
                  <p>It is used as a reference for IELTS, TOEFL, TOEIC and study/work abroad applications.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>How it works</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>1. Fill in your info — 1 minute.</p>
                  <p>2. Answer 30 questions — grammar, vocabulary, reading & listening cues.</p>
                  <p>3. Get your CEFR level instantly on screen.</p>
                  <p>4. Receive a personalised plan on LINE within 24 hours.</p>
                </CardContent>
              </Card>
            </section>

            <section className="mt-8">
              <Card>
                <CardHeader><CardTitle>The 6 CEFR levels</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left border-b">
                      <th className="py-2 pr-4">Level</th><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">What you can do</th><th className="py-2">IELTS</th>
                    </tr></thead>
                    <tbody className="text-muted-foreground">
                      <tr className="border-b"><td className="py-2 pr-4 font-semibold text-foreground">A1</td><td className="py-2 pr-4">Get Started</td><td className="py-2 pr-4">Letters, basic words, greetings, simple questions</td><td className="py-2">—</td></tr>
                      <tr className="border-b"><td className="py-2 pr-4 font-semibold text-foreground">A2</td><td className="py-2 pr-4">Basics</td><td className="py-2 pr-4">Talk about yourself, family, hobbies</td><td className="py-2">3.0</td></tr>
                      <tr className="border-b"><td className="py-2 pr-4 font-semibold text-foreground">B1</td><td className="py-2 pr-4">Intermediate</td><td className="py-2 pr-4">Tell stories, explain ideas, follow conversations</td><td className="py-2">4.0–5.0</td></tr>
                      <tr className="border-b"><td className="py-2 pr-4 font-semibold text-foreground">B2</td><td className="py-2 pr-4">Upper-Intermediate</td><td className="py-2 pr-4">Fluent with natives, work in English</td><td className="py-2">5.5–6.5</td></tr>
                      <tr className="border-b"><td className="py-2 pr-4 font-semibold text-foreground">C1</td><td className="py-2 pr-4">Advanced</td><td className="py-2 pr-4">Fluent in all contexts, business negotiation</td><td className="py-2">7.0–8.0</td></tr>
                      <tr><td className="py-2 pr-4 font-semibold text-foreground">C2</td><td className="py-2 pr-4">Proficient</td><td className="py-2 pr-4">Near-native understanding and use</td><td className="py-2">8.5–9.0</td></tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </section>
          </>
        )}

        {step === "quiz" && current && (
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">Question {qIndex + 1} of {QUESTIONS.length}</Badge>
                <Badge>{current.category}</Badge>
              </div>
              <Progress value={progress} />
            </CardHeader>
            <CardContent className="space-y-6">
              {current.passage && (
                <div className="rounded-lg border bg-muted/40 p-4 text-sm italic">{current.passage}</div>
              )}
              <h2 className="text-xl font-semibold">{current.question}</h2>
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
                  {qIndex === QUESTIONS.length - 1 ? (submitting ? "Submitting…" : "Finish") : "Next"} <ArrowRight className="ml-2 h-4 w-4" />
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
                <p className="text-sm mt-2">Score: <strong>{result.total} / {QUESTIONS.length}</strong></p>
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
