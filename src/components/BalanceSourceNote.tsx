import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Receipt, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatLessonsLeft } from "@/lib/lessons";
import { balanceSourceLabel, useBalanceSource } from "@/hooks/useBalanceSource";

type Props = {
  studentId: string;
  resetAt?: string | null;
  purchased: number;
  used: number;
  /** Show the admin "Adjust" button. */
  editable?: boolean;
  onUpdated?: () => void;
};

/** Explains where the current lesson balance came from (which invoice, date and lesson count). */
export function BalanceSourceNote({ studentId, resetAt, purchased, used, editable, onUpdated }: Props) {
  const { source } = useBalanceSource(studentId, resetAt);
  const remaining = Math.max(0, purchased - used);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(remaining));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const desired = parseInt(value, 10);
    if (isNaN(desired) || desired < 0 || desired > 999) return toast.error("Enter a number between 0 and 999");
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ lessons_purchased: used + desired })
      .eq("id", studentId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Balance set to ${formatLessonsLeft(desired)}`);
    setOpen(false);
    onUpdated?.();
  };

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

        {editable && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setValue(String(remaining)); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="ml-auto rounded-full">
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Adjust lessons left
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Adjust lessons left</DialogTitle>
                <DialogDescription>
                  Set the exact number of lessons remaining. The package total updates automatically
                  ({used} lessons already used since the reset date are kept).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="lessons-left">Lessons left</Label>
                <Input
                  id="lessons-left"
                  type="number"
                  min={0}
                  max={999}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
