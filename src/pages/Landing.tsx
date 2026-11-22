import { Link } from "react-router-dom";
import { CalendarCheck, BookOpen, BarChart3, CreditCard, Video, UserCheck, Check, ArrowRight } from "lucide-react";
import defaultLogo from "@/assets/logo.png";
import teacher from "@/assets/teacher-photo.jpg";
import { useSiteContent, type LandingContent } from "@/lib/siteContent";
import { HomePrices } from "@/components/HomePrices";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const T = {
  how: "How it works", features: "Features", faq: "FAQ", login: "Log in", signup: "Sign up", portal: "Go to portal",
  start: "Start learning", studentLogin: "Student log in", getStarted: "Get started", why: "Why learn with us",
  faqTitle: "Frequently asked questions", teacher: "Your English teacher",
};

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

const faq = [
  ["How do I start?", "Create an account and your teacher will set up your profile and lessons."],
  ["Can I see my past lessons?", "Yes — every lesson, link and quiz score is saved in your portal."],
  ["How do I pay?", "Your invoices and instalment plans are shown under Payments in your portal."],
];

export { defaultLanding, useLandingContent } from "@/lib/siteContent";
export type { LandingContent } from "@/lib/siteContent";

export default function Landing({ content }: { content?: LandingContent }) {
  const loaded = useSiteContent();
  const c = content ?? loaded;
  const logo = c.logo_url || defaultLogo;
  const name = c.school_name || "ARP Speak English With Me";
  const { user, role, loading } = useAuth();
  const t = T;
  const portal = role === "admin" ? "/dashboard" : role === "teacher" ? "/schedule" : "/my-profile";
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt={name} className="h-10 w-auto" />
            <span className="hidden font-bold sm:block">{name}</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">{t.how}</a>
            <a href="#features" className="hover:text-foreground">{t.features}</a>
            {c.show_prices && <a href="#prices" className="hover:text-foreground">Prices</a>}
            <a href="#faq" className="hover:text-foreground">{t.faq}</a>
          </nav>
          <div className="flex items-center gap-2">
            {loading ? null : user ? (
              <Button className="rounded-full px-5" asChild>
                <Link to={portal}>{t.portal} <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/auth">{t.login}</Link></Button>
                <Button className="rounded-full px-5" asChild><Link to="/auth">{t.signup}</Link></Button>
              </>
            )}
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
              {user ? (
                <Button size="lg" className="h-14 rounded-full px-8 text-base" asChild>
                  <Link to={portal}>{t.portal} <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" className="h-14 rounded-full px-8 text-base" asChild>
                    <Link to="/auth">{t.start} <ArrowRight className="ml-2 h-5 w-5" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" className="h-14 rounded-full px-8 text-base" asChild>
                    <Link to="/auth">{t.studentLogin}</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="relative">
            <img src={c.photo_url || teacher} alt={t.teacher}
              className="mx-auto max-h-[560px] w-full rounded-3xl object-cover object-top shadow-xl" />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-extrabold sm:text-4xl">{t.how}</h2>
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
          <h2 className="text-center text-3xl font-extrabold sm:text-4xl">{t.why}</h2>
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
        <h2 className="text-center text-3xl font-extrabold sm:text-4xl">{t.faqTitle}</h2>
        <div className="mt-10 space-y-4">
          {faq.map(([q, a]) => (
            <details key={q} className="rounded-xl border border-border p-5">
              <summary className="cursor-pointer font-semibold">{q}</summary>
              <p className="mt-2 text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {c.show_prices && <HomePrices heading={c.prices_heading || "Lesson prices & packages"} />}

      {/* CTA */}
      <section className="bg-primary py-16 text-center text-primary-foreground">
        <h2 className="text-3xl font-extrabold sm:text-4xl">{c.cta_heading}</h2>
        {user ? (
          <Button size="lg" variant="secondary" className="mt-8 h-14 rounded-full px-10 text-base" asChild>
            <Link to={portal}>{t.portal}</Link>
          </Button>
        ) : (
          <Button size="lg" variant="secondary" className="mt-8 h-14 rounded-full px-10 text-base" asChild>
            <Link to="/auth">{t.getStarted}</Link>
          </Button>
        )}
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} {name}</span>
          {user ? (
            <Link to={portal} className="font-medium text-primary hover:underline">{t.portal}</Link>
          ) : (
            <Link to="/auth" className="font-medium text-primary hover:underline">{t.studentLogin}</Link>
          )}
        </div>
      </footer>
    </div>
  );
}
