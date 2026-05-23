import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { students, Level } from "@/data/mockData";

const levels: ("all" | Level)[] = ["all", "A1", "A2", "B1", "B2", "C1", "C2"];

export default function Students() {
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<"all" | Level>("all");

  const filtered = useMemo(
    () =>
      students.filter(
        (s) =>
          (level === "all" || s.level === level) &&
          (s.name.toLowerCase().includes(q.toLowerCase()) ||
            s.email.toLowerCase().includes(q.toLowerCase()))
      ),
    [q, level]
  );

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-elegant">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={level} onValueChange={(v) => setLevel(v as "all" | Level)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {levels.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l === "all" ? "All levels" : l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="gradient-primary text-primary-foreground shadow-glow">
              <Plus className="mr-1 h-4 w-4" /> Add student
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => {
          const latest = s.scores[s.scores.length - 1];
          return (
            <Link key={s.id} to={`/students/${s.id}`}>
              <Card className="group h-full border-border/60 shadow-elegant transition-all hover:-translate-y-0.5 hover:shadow-elevated">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14 ring-2 ring-primary/10">
                      <AvatarImage src={s.avatarUrl} />
                      <AvatarFallback>{s.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold">{s.name}</h3>
                        <Badge variant="secondary" className="rounded-full">{s.level}</Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{s.goals}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-secondary/50 p-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">Speaking</p>
                      <p className="text-lg font-bold text-primary">{latest.speaking}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Grammar</p>
                      <p className="text-lg font-bold text-accent">{latest.grammar}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-muted-foreground">
            No students match your filters.
          </p>
        )}
      </div>
    </div>
  );
}
