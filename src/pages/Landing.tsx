import { Link } from "react-router-dom";
import { CalendarCheck, BookOpen, BarChart3, CreditCard, Video, UserCheck, Check, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import teacher from "@/assets/teacher-photo.jpg";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export type Lang = "en" | "th";
const T = {
  en: {
    how: "How it works", features: "Features", faq: "FAQ", login: "Log in", signup: "Sign up", portal: "Go to portal",
    start: "Start learning", studentLogin: "Student log in", getStarted: "Get started", why: "Why learn with us",
    faqTitle: "Frequently asked questions", teacher: "Your English teacher",
  },
  th: {
    how: "วิธีการเรียน", features: "จุดเด่น", faq: "คำถามที่พบบ่อย", login: "เข้าสู่ระบบ", signup: "สมัครสมาชิก", portal: "ไปที่พอร์ทัล",
    start: "เริ่มเรียน", studentLogin: "นักเรียนเข้าสู่ระบบ", getStarted: "เริ่มต้นเลย", why: "ทำไมต้องเรียนกับเรา",
    faqTitle: "คำถามที่พบบ่อย", teacher: "ครูสอนภาษาอังกฤษของคุณ",
  },
};

const stepsTh = [
  { n: 1, title: "สร้างบัญชีของคุณ", text: "สมัครได้ในหนึ่งนาที แล้วครูจะตั้งค่าโปรไฟล์ให้คุณ" },
  { n: 2, title: "จองบทเรียน", text: "เลือกเวลาว่างสีเขียวที่สะดวกสำหรับคุณ" },
  { n: 3, title: "เรียนแบบตัวต่อตัว", text: "เข้าเรียนแบบส่วนตัวและเรียนตามหลักสูตรของคุณเอง" },
];
const featuresTh = [
  ["เรียนส่วนตัวแบบตัวต่อตัว", "บทเรียนที่ออกแบบมาเพื่อคุณ ตามระดับและจังหวะของคุณ"],
  ["จองเวลาได้ยืดหยุ่น", "ดูเวลาว่างและจองบทเรียนได้ทุกเมื่อที่สะดวก"],
  ["หลักสูตรของคุณเอง", "แผนการเรียนส่วนตัว บันทึกทุกบทเรียนและลิงก์ไว้ครบ"],
  ["ติดตามความก้าวหน้า", "ระดับ CEFR คะแนนแบบทดสอบ และรายงาน แสดงพัฒนาการของคุณ"],
  ["เคล็ดลับและวิดีโอ", "ดูเคล็ดลับภาษาอังกฤษและคลิปการสอนได้ตลอดเวลา"],
  ["การชำระเงินชัดเจน", "ใบแจ้งหนี้และแผนผ่อนชำระอยู่ในที่เดียว"],
];
const faqEn = [
  ["How do I start?", "Create an account and your teacher will set up your profile and lessons."],
  ["Can I see my past lessons?", "Yes — every lesson, link and quiz score is saved in your portal."],
  ["How do I pay?", "Your invoices and instalment plans are shown under Payments in your portal."],
];
const faqTh = [
  ["จะเริ่มเรียนได้อย่างไร?", "สร้างบัญชี แล้วครูจะตั้งค่าโปรไฟล์และบทเรียนให้คุณ"],
  ["ดูบทเรียนที่ผ่านมาได้ไหม?", "ได้ ทุกบทเรียน ลิงก์ และคะแนนแบบทดสอบ ถูกบันทึกไว้ในพอร์ทัลของคุณ"],
  ["ชำระเงินอย่างไร?", "ใบแจ้งหนี้และแผนผ่อนชำระจะแสดงในเมนูการชำระเงินในพอร์ทัลของคุณ"],
];

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
  headline_th: string; subtitle_th: string; bullets_th: string[]; cta_heading_th: string;
};
export const defaultLanding: LandingContent = {
  headline: "1-on-1 private online English lessons",
  subtitle: "Speak English with confidence. Personal lessons, your own curriculum, and clear progress tracking — all in one student portal.",
  bullets: ["Lessons for kids, teens and adults", "Learn at your own pace", "See every lesson and score"],
  photo_url: "",
  cta_heading: "Ready to speak English with confidence?",
  headline_th: "เรียนภาษาอังกฤษออนไลน์แบบตัวต่อตัว",
  subtitle_th: "พูดภาษาอังกฤษได้อย่างมั่นใจ ด้วยบทเรียนส่วนตัว หลักสูตรของคุณเอง และการติดตามความก้าวหน้าที่ชัดเจน ครบในพอร์ทัลเดียว",
  bullets_th: ["บทเรียนสำหรับเด็ก วัยรุ่น และผู้ใหญ่", "เรียนตามจังหวะของคุณเอง", "ดูทุกบทเรียนและคะแนนได้"],
  cta_heading_th: "พร้อมพูดภาษาอังกฤษอย่างมั่นใจแล้วหรือยัง?",
};

export function useLang() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("landing_lang") as Lang) || "en");
  useEffect(() => { localStorage.setItem("landing_lang", lang); }, [lang]);
  return [lang, setLang] as const;
}

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
  const { user, role, loading } = useAuth();
  const [lang, setLang] = useLang();
  const t = T[lang];
  const th = lang === "th";
  const view = {
    headline: th ? c.headline_th || c.headline : c.headline,
    subtitle: th ? c.subtitle_th || c.subtitle : c.subtitle,
    bullets: th ? (c.bullets_th?.some(Boolean) ? c.bullets_th : c.bullets) : c.bullets,
    cta: th ? c.cta_heading_th || c.cta_heading : c.cta_heading,
  };
  const stepList = th ? stepsTh : steps;
  const featList = features.map((f, i) => th ? { ...f, title: featuresTh[i][0], text: featuresTh[i][1] } : f);
  const portal = role === "admin" ? "/dashboard" : role === "teacher" ? "/schedule" : "/my-profile";
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
            <a href="#how" className="hover:text-foreground">{t.how}</a>
            <a href="#features" className="hover:text-foreground">{t.features}</a>
            <a href="#faq" className="hover:text-foreground">{t.faq}</a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border border-border p-0.5 text-xs font-semibold" role="group" aria-label="Language">
              {(["en", "th"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
                  className={`rounded-full px-2.5 py-1 ${lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {l === "en" ? "EN" : "ไทย"}
                </button>
              ))}
            </div>
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
              {view.headline}
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              {view.subtitle}
            </p>
            <ul className="mt-6 space-y-2">
              {view.bullets.filter(Boolean).map((t) => (
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
          {stepList.map((s) => (
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
            {featList.map((f) => (
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
          {(th ? faqTh : faqEn).map(([q, a]) => (
            <details key={q} className="rounded-xl border border-border p-5">
              <summary className="cursor-pointer font-semibold">{q}</summary>
              <p className="mt-2 text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-center text-primary-foreground">
        <h2 className="text-3xl font-extrabold sm:text-4xl">{view.cta}</h2>
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
          <span>© {new Date().getFullYear()} ARP Speak English With Me</span>
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
