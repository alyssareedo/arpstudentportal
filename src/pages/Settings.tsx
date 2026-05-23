import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function Settings() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="border-border/60 shadow-elegant">
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-primary/10">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=Teacher" />
              <AvatarFallback>T</AvatarFallback>
            </Avatar>
            <Button variant="outline">Change avatar</Button>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label>Full name</Label><Input defaultValue="Alex Rivera" /></div>
            <div className="grid gap-2"><Label>Email</Label><Input defaultValue="teacher@linguadesk.com" /></div>
            <div className="grid gap-2"><Label>School</Label><Input defaultValue="LinguaDesk Academy" /></div>
            <div className="grid gap-2"><Label>Timezone</Label><Input defaultValue="GMT+1 (Madrid)" /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-elegant">
        <CardHeader><CardTitle>Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Email me before each lesson", desc: "30 minutes before scheduled time" },
            { label: "Weekly summary", desc: "Every Monday at 8am" },
            { label: "Share student progress", desc: "Allow shareable student links" },
          ].map((p) => (
            <div key={p.label} className="flex items-center justify-between rounded-xl border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
              <Switch defaultChecked />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="gradient-primary text-primary-foreground shadow-glow" onClick={() => toast.success("Settings saved")}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
