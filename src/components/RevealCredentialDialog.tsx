import { useState } from "react";
import { Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

/**
 * Shows a one-off credential in a copy-only, hidden-by-default dialog.
 * The value is never written to a toast or auto-copied, limiting exposure to
 * screen recordings, session replay and DOM-scraping analytics.
 */
export function RevealCredentialDialog({
  open, onOpenChange, title, description, value,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  value: string;
}) {
  const [shown, setShown] = useState(false);

  const close = (v: boolean) => {
    if (!v) setShown(false);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 p-3">
          <code data-private className="flex-1 truncate font-mono text-sm">
            {shown ? value : "•".repeat(Math.min(value.length, 24))}
          </code>
          <Button type="button" variant="ghost" size="icon" onClick={() => setShown((s) => !s)}>
            {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(value).catch(() => {});
              toast.success("Copied to clipboard");
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          This is shown only once. Share it over a secure channel and ask the student to change it after signing in.
        </p>
        <DialogFooter>
          <Button onClick={() => close(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
