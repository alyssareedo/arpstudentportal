import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("teacher@linguadesk.com");
  const [password, setPassword] = useState("demo1234");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-secondary via-background to-secondary/40">
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-12 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl gradient-primary shadow-glow">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight">
            Teach English. <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Track everything.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            The all-in-one CRM built for ESL teachers and language schools — lessons,
            homework, progress and reports in one calm dashboard.
          </p>
          <div className="mt-8 flex gap-6 text-sm text-muted-foreground">
            <div>
              <p className="text-2xl font-bold text-foreground">12k+</p>
              <p>Students managed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">98%</p>
              <p>Attendance tracking</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">5★</p>
              <p>Teacher rating</p>
            </div>
          </div>
        </div>

        <Card className="border-border/60 shadow-elevated">
          <CardContent className="p-8">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">LinguaDesk</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to your teacher account.
            </p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a className="text-xs text-primary hover:underline" href="#">
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="group w-full gradient-primary text-primary-foreground shadow-glow hover:opacity-95">
                Sign in
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Demo mode — any credentials work.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
