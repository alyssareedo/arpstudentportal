import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  accent?: "primary" | "accent" | "success" | "warning";
}

const accentMap = {
  primary: "from-primary/15 to-primary/5 text-primary",
  accent: "from-accent/15 to-accent/5 text-accent",
  success: "from-success/15 to-success/5 text-success",
  warning: "from-warning/15 to-warning/5 text-warning",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendUp,
  accent = "primary",
}: StatCardProps) {
  return (
    <Card className="overflow-hidden border-border/60 shadow-elegant transition-all hover:-translate-y-0.5 hover:shadow-elevated">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trend && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trendUp ? "text-success" : "text-muted-foreground"
                )}
              >
                {trend}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br",
              accentMap[accent]
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
