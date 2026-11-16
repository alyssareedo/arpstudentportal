import { Link } from "react-router-dom";
import { CalendarCheck, BookOpen, BarChart3, CreditCard, Video, UserCheck, Check, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import teacher from "@/assets/teacher-photo.jpg";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const steps = [
  { n: 1, title: "Create your account", text: "Sign up in a minute — your teacher will set up your profile." },
  { n: 2, title: "Book a lesson", text: "Pick a green available time that suits your schedule." },
  { n: 3, title: "Learn 1-on-1", text: "Join your private lesson and follow your personal curriculum." },
];

const features = [
  { icon: UserCheck, title: "1-on-1 private lessons", text: "Lessons made just for you, at your level and pace." },
  { icon: CalendarCheck, title: "Flexible booking", text: "See open times and book lessons whenever it suits you." },
  { icon: BookOpen, title: "Your own curriculum", text: "A personal learning plan with every lesson and link saved." },
  { icon: BarChart3, title: "Track your progress", text: "CEFR levels, quiz scores and reports show how you grow." },
  { icon: Video, title: "Tips & videos", text: "Watch English tips and teaching clips anytime." },
  { icon: CreditCard, title: "Clear payments", text: "Invoices and instalment plans all in one place." },
];

export type LandingContent = {
  headline: string; subtitle: string; bullets: string[]; photo_url: string; cta_heading: string;
};
export const defaultLanding: LandingContent = {
  headline: "1-on-1 private online English lessons",
  subtitle: "Speak English with confidence. Personal lessons, your own curriculum, and clear progress tracking — all in one student portal.",
  bullets: ["Lessons for kids, teens and adults", "Learn at your own pace", "See every lesson and score"],
  photo_url: "",
  cta_heading: "Ready to speak English with confidence?",
};

export function useLandingContent() {
  const [c, setC] = useState<LandingContent>(defaultLanding);
  useEffect(() => {
    supabase.from("landing_content").select("content").eq("id", 1).maybeSingle().then(({ data }) => {
      if (data?.content) setC({ ...defaultLanding, ...(data.content as Partial<LandingContent>) });
    });
  }, []);
  return [c, setC] as const;
}

export default function Landing({ content }: { content?: LandingContent }) {
  const [loaded] = useLandingContent();
  const c = content ?? loaded;
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="ARP Speak English With Me" className="h-10 w-auto" />
            <span className="hidden font-bold sm:block">ARP Speak English With Me</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild><Link to="/auth">Log in</Link></Button>
            <Button className="rounded-full px-5" asChild><Link to="/auth">Sign up</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-secondary/50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {c.headline}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              {c.subtitle}
            </p>
            <ul className="mt-6 space-y-2">
              {c.bullets.filter(Boolean).map((t) => (
                <li key={t} className="flex items-center gap-2 font-medium">
                  <Check className="h-5 w-5 text-primary" /> {t}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" className="h-14 rounded-full px-8 text-base" asChild>
                <Link to="/auth">Start learning <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 rounded-full px-8 text-base" asChild>
                <Link to="/auth">Student log in</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <img src={c.photo_url || teacher} alt="Your English teacher"
              className="mx-auto max-h-[560px] w-full rounded-3xl object-cover object-top shadow-xl" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-extrabold sm:text-4xl">How it works</h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">{s.n}</div>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-secondary/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-extrabold sm:text-4xl">Why learn with us</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl bg-card p-7 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-center text-3xl font-extrabold sm:text-4xl">Frequently asked questions</h2>
        <div className="mt-10 space-y-4">
          {[
            ["How do I start?", "Create an account and your teacher will set up your profile and lessons."],
            ["Can I see my past lessons?", "Yes — every lesson, link and quiz score is saved in your portal."],
            ["How do I pay?", "Your invoices and instalment plans are shown under Payments in your portal."],
          ].map(([q, a]) => (
            <details key={q} className="rounded-xl border border-border p-5">
              <summary className="cursor-pointer font-semibold">{q}</summary>
              <p className="mt-2 text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-center text-primary-foreground">
        <h2 className="text-3xl font-extrabold sm:text-4xl">{c.cta_heading}</h2>
        <Button size="lg" variant="secondary" className="mt-8 h-14 rounded-full px-10 text-base" asChild>
          <Link to="/auth">Get started</Link>
        </Button>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} ARP Speak English With Me</span>
          <Link to="/auth" className="font-medium text-primary hover:underline">Student log in</Link>
        </div>
      </footer>
    </div>
  );
}
