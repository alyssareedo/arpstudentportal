import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Mail, Lock, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { useBrand } from "@/components/Branding";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const brand = useBrand();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate("/");
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    navigate("/");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-secondary via-background to-secondary/40">
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-12 lg:grid-cols-2">
        <div className="hidden lg:block">
          <img src={logo} alt="ARP Speak English With Me" className="h-44 w-auto drop-shadow-xl" />
          <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight">
            Speak English <br />
            <span className="bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              with confidence
            </span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-muted-foreground">
            Your home for lessons, homework and progress — together with your teacher.
          </p>
        </div>

        <Card className="border-border/60 shadow-elevated">
          <CardContent className="p-8">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <img src={brand.logo} alt={brand.name} className="h-12 w-auto" />
              <span className="text-lg font-bold">{brand.name}</span>
            </div>

            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 rounded-full">
                <TabsTrigger value="signin" className="rounded-full">Sign in</TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <h2 className="mt-4 text-2xl font-bold tracking-tight">Welcome back</h2>
                <p className="mt-1 text-sm text-muted-foreground">Sign in to your account.</p>
                <form className="mt-6 space-y-4" onSubmit={signIn}>
                  <Field label="Email" icon={Mail} type="email" value={email} onChange={setEmail} />
                  <Field label="Password" icon={Lock} type="password" value={password} onChange={setPassword} />
                  <Button type="submit" disabled={busy} className="group w-full gradient-primary text-primary-foreground shadow-glow">
                    Sign in <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) return toast.error("Enter your email first");
                      const { error } = await supabase.auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/reset-password`,
                      });
                      if (error) toast.error(error.message);
                      else toast.success("Reset email sent — check your inbox");
                    }}
                    className="block w-full text-center text-xs text-muted-foreground hover:text-primary"
                  >
                    Forgot password?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <h2 className="mt-4 text-2xl font-bold tracking-tight">Create account</h2>
                <p className="mt-1 text-sm text-muted-foreground">First account becomes the admin (teacher).</p>
                <form className="mt-6 space-y-4" onSubmit={signUp}>
                  <Field label="Full name" icon={GraduationCap} value={fullName} onChange={setFullName} />
                  <Field label="Email" icon={Mail} type="email" value={email} onChange={setEmail} />
                  <Field label="Password" icon={Lock} type="password" value={password} onChange={setPassword} />
                  <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground shadow-glow">
                    Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, type = "text", value, onChange }: { label: string; icon: any; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input type={type} className="pl-9" value={value} onChange={(e) => onChange(e.target.value)} required />
      </div>
    </div>
  );
}
