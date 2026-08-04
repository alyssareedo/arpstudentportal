import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type BalanceSource = {
  invoice_number: string;
  issue_date: string;
  lessons_count: number;
  package_name: string | null;
} | null;

/**
 * Finds the invoice that the student's current lesson balance came from:
 * the most recent invoice with lessons, issued on or before the balance reset date.
 */
export function useBalanceSource(studentId?: string, resetAt?: string | null) {
  const [source, setSource] = useState<BalanceSource>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!studentId) { setSource(null); return; }
    setLoading(true);
    (async () => {
      let q = supabase
        .from("invoices")
        .select("invoice_number, issue_date, lessons_count, package_name")
        .eq("student_id", studentId)
        .gt("lessons_count", 0)
        .order("issue_date", { ascending: false })
        .limit(1);
      if (resetAt) q = q.lte("issue_date", resetAt);
      const { data } = await q;
      if (cancelled) return;
      const row = data?.[0];
      setSource(row ? (row as any) : null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [studentId, resetAt]);

  return { source, loading };
}

export function balanceSourceLabel(source: BalanceSource, resetAt?: string | null) {
  if (source) {
    return `From invoice ${source.invoice_number} · ${source.issue_date} · ${source.lessons_count} lessons${source.package_name ? ` (${source.package_name})` : ""}`;
  }
  if (resetAt) return `Set manually · balance counted from ${resetAt}`;
  return "Set manually · no invoice linked";
}
