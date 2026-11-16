import { Link } from "react-router-dom";
import {
  GraduationCap,
  CalendarCheck,
  BookOpen,
  BarChart3,
  CreditCard,
  Video,
  ArrowRight,
  LogIn,
} from "lucide-react";
import logo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: CalendarCheck,
    title: "Book & track lessons",
    text: "See available times, book lessons, and follow your schedule in one place.",
  },
  {
    icon: BookOpen,
    title: "Your own curriculum",
    text: "Every student has a personal learning plan with lesson records and links.",
  },
  {
    icon: BarChart3,
    title: "Progress & assessments",
    text: "CEFR levels, quiz scores, and reports show how your English is growing.",
  },
  {
    icon: CreditCard,
    title: "Clear payments",
    text: "View invoices and installment plans so you always know where you stand.",
  },
  {
    icon: Video,
    title: "Tips & videos",
    text: "Watch teaching clips and English tips shared by your teacher.",
  },
  {
    icon: GraduationCap,
    title: "Made for learners",
    text: "Kids, teens, and adults — one simple portal for every student.",
  },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-secondary via-background to-secondary/40">
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      {/* Header */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="ARP Speak English With Me" className="h-12 w-auto" />
          <span className="hidden text-lg font-semibold sm:block">ARP Speak English With Me</span>
        </div>
        <Button asChild>
          <Link to="/auth">
            <LogIn className="mr-2 h-4 w-4" /> Student sign in
          </Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-14 lg:grid-cols-2">
        <div>
          <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Learn English{" "}
            <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              with confidence
            </span>
          </h1>
          <p className="mt-4 max-w-lg text-lg text-muted-foreground">
            Welcome to your student portal. Book lessons, follow your personal curriculum,
            track your progress, and manage payments — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/auth">
                Sign in to your portal <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth">Create an account</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            New student? Your teacher will help you get started after you create an account.
          </p>
        </div>
        <div className="hidden justify-center lg:flex">
          <img src={logo} alt="ARP Speak English With Me" className="h-72 w-auto drop-shadow-xl" />
        </div>
      </section>

      {/* Features */}
      <section className="relative mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Everything you need to learn</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-muted-foreground">
          One simple portal for lessons, learning materials, and your progress.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className="border-border/60 bg-card/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/60 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} ARP Speak English With Me</span>
          <Link to="/auth" className="font-medium text-primary hover:underline">
            Student sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
