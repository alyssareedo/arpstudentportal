import { useState, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { Trash2 } from "lucide-react";

export function useBulkSelect() {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }, []);
  const clear = useCallback(() => setSelected([]), []);
  const stop = useCallback(() => { setActive(false); setSelected([]); }, []);

  return { active, setActive, selected, setSelected, toggle, clear, stop };
}

interface BarProps {
  active: boolean;
  selected: string[];
  allIds: string[];
  onStart: () => void;
  onStop: () => void;
  onSelectAll: (ids: string[]) => void;
  onClear: () => void;
  onDelete: () => Promise<void>;
  noun?: string;
}

export function BulkSelectBar({
  active, selected, allIds, onStart, onStop, onSelectAll, onClear, onDelete, noun = "item",
}: BarProps) {
  if (!active) {
    return (
      <Button variant="outline" size="sm" className="rounded-full" onClick={onStart}>
        Select
      </Button>
    );
  }
  const allChecked = allIds.length > 0 && selected.length === allIds.length;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5">
      <label className="flex items-center gap-2 text-xs">
        <Checkbox checked={allChecked} onCheckedChange={(c) => (c ? onSelectAll(allIds) : onClear())} />
        Select all
      </label>
      <span className="text-xs text-muted-foreground">{selected.length} selected</span>
      <ConfirmDeleteButton
        onConfirm={onDelete}
        title={`Delete ${selected.length} ${noun}${selected.length === 1 ? "" : "s"}?`}
        description="This permanently removes the selected items. This cannot be undone."
        trigger={
          <Button variant="destructive" size="sm" className="rounded-full" disabled={selected.length === 0}>
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
          </Button>
        }
      />
      <Button variant="ghost" size="sm" className="rounded-full" onClick={onStop}>Cancel</Button>
    </div>
  );
}
