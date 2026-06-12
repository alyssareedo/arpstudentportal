import { useState, ReactNode } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface Props {
  onConfirm: () => Promise<void> | void;
  title?: string;
  description?: string;
  /** When omitted, renders a small icon-only ghost button. */
  trigger?: ReactNode;
  size?: "icon" | "sm" | "default";
  variant?: "ghost" | "outline" | "destructive";
  label?: string;
}

export function ConfirmDeleteButton({
  onConfirm,
  title = "Delete this item?",
  description = "This permanently removes it. Historical records linked to other items are kept.",
  trigger,
  size = "icon",
  variant = "ghost",
  label,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant={variant} size={size} className={size === "icon" ? "h-7 w-7 text-destructive hover:text-destructive" : ""} aria-label="Delete">
            <Trash2 className={size === "icon" ? "h-3.5 w-3.5" : "mr-1 h-4 w-4"} />
            {label}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); run(); }} disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
