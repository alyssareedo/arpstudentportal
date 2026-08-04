import { Card, CardContent } from "@/components/ui/card";
import { Receipt } from "lucide-react";
import { formatLessonsLeft } from "@/lib/lessons";
import { balanceSourceLabel, useBalanceSource } from "@/hooks/useBalanceSource";

type Props = {
  studentId: string;
  resetAt?: string | null;
  purchased: number;
  used: number;
};

/** Explains where the current lesson balance came from (which invoice, date and lesson count). */
export function BalanceSourceNote({ studentId, resetAt, purchased, used }: Props) {
  const { source } = useBalanceSource(studentId, resetAt);
  const remaining = Math.max(0, purchased - used);

  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          {formatLessonsLeft(remaining)}
        </span>
        <span className="text-muted-foreground">
          {purchased} lessons in package · {used} used{resetAt ? ` since ${resetAt}` : ""}
        </span>
        <span className="text-muted-foreground">· {balanceSourceLabel(source, resetAt)}</span>
      </CardContent>
    </Card>
  );
}
