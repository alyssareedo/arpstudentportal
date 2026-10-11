import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown, ChevronUp, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Plan {
  id: string; student_id: string; package_name: string; total_amount: number; installments_count: number;
  monthly_amount: number; currency: string; purchase_date: string; first_due_date: string;
  lessons_added: number; payment_instructions: string | null;
}
export interface Installment {
  id: string; plan_id: string; installment_number: number; due_date: string; amount: number;
  status: string; paid_at: string | null; payment_reference: string | null; admin_notes: string | null; invoice_id: string | null;
}

const ord = (n: number) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return s[(v - 20) % 10] || s[v] || s[0]; };
const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB");
const money = (n: number, c = "THB") => `${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${c}`;
const daysUntil = (d: string) => Math.round((new Date(d + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);

export function installmentState(i: Installment, pendingProof: boolean) {
  if (i.status === "paid") return "paid";
  if (pendingProof) return "verifying";
  const d = daysUntil(i.due_date);
  if (d < 0) return "overdue";
  if (d <= 7) return "due";
  return "upcoming";
}

export function InstallmentSchedule({ plan, items, proofInvoiceIds, onPay }: {
  plan: Plan; items: Installment[]; proofInvoiceIds: Set<string>; onPay?: (i: Installment) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const sorted = [...items].sort((a, b) => a.installment_number - b.installment_number);
  const paid = sorted.filter((i) => i.status === "paid");
  const totalPaid = paid.reduce((s, i) => s + Number(i.amount), 0);
  const next = sorted.find((i) => i.status !== "paid");
  const nextIdx = next ? sorted.indexOf(next) : -1;
  const shown = expanded ? sorted : sorted.slice(Math.max(0, nextIdx - 1), nextIdx + 1);

  return (
    <Card className="shadow-elegant">
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-sm font-bold tracking-wide">PAYMENT SCHEDULE</h3>
          <button className="flex items-center gap-1 text-sm font-medium text-primary" onClick={() => setExpanded(!expanded)}>
            {expanded ? <>View less <ChevronUp className="h-4 w-4" /></> : <>View all <ChevronDown className="h-4 w-4" /></>}
          </button>
        </div>

        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-bold">{plan.package_name}</p>
            <p className="text-sm text-muted-foreground">Purchased on {fmtDate(plan.purchase_date)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {plan.installments_count} × {money(plan.monthly_amount, plan.currency)} · {paid.length} of {plan.installments_count} paid
            </p>
          </div>
          <p className="text-lg font-bold">{money(plan.total_amount, plan.currency)}</p>
        </div>

        <ol className="mt-6">
          {shown.map((i, idx) => {
            const st = installmentState(i, !!i.invoice_id && proofInvoiceIds.has(i.invoice_id));
            const d = daysUntil(i.due_date);
            const last = idx === shown.length - 1;
            return (
              <li key={i.id} className="relative flex gap-4 pb-6">
                {!last && <span className={cn("absolute left-[15px] top-8 h-full w-0.5", st === "paid" ? "bg-success" : "bg-border")} />}
                <span className={cn("z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                  st === "paid" && "border-success/30 bg-success/20 text-success",
                  st === "verifying" && "border-warning bg-warning/10 text-warning",
                  st === "overdue" && "border-destructive bg-destructive/10 text-destructive",
                  (st === "due" || st === "upcoming") && i === next && "border-primary bg-background",
                  (st === "due" || st === "upcoming") && i !== next && "border-border bg-background")}>
                  {st === "paid" ? <Check className="h-4 w-4" /> : st === "verifying" ? <Clock className="h-4 w-4" /> :
                    st === "overdue" ? <AlertCircle className="h-4 w-4" /> : i === next ? <span className="h-3 w-3 rounded-full bg-primary" /> : null}
                </span>
                <div className="flex flex-1 items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{i.installment_number}<sup>{ord(i.installment_number)}</sup> instalment</p>
                    <p className="text-sm text-muted-foreground">Due {fmtDate(i.due_date)}</p>
                    {st === "paid" && <p className="text-sm text-success">Paid{i.paid_at ? ` on ${fmtDate(i.paid_at)}` : ""}</p>}
                    {st === "verifying" && <span className="mt-1 inline-block rounded-full bg-warning/15 px-3 py-0.5 text-xs font-semibold text-warning">PENDING VERIFICATION</span>}
                    {st === "overdue" && <span className="mt-1 inline-block rounded-full bg-destructive px-3 py-0.5 text-xs font-semibold text-destructive-foreground">OVERDUE {-d} DAYS</span>}
                    {st === "due" && <span className="mt-1 inline-block rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">{d === 0 ? "DUE TODAY" : `DUE IN ${d} DAYS`}</span>}
                    {st === "upcoming" && i === next && <span className="mt-1 inline-block rounded-full bg-secondary px-3 py-0.5 text-xs font-semibold">DUE IN {d} DAYS</span>}
                  </div>
                  <p className="font-medium">{money(i.amount, plan.currency)}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="grid grid-cols-2 gap-3 border-t pt-4 text-sm">
          <div><p className="text-muted-foreground">Total paid</p><p className="font-semibold">{money(totalPaid, plan.currency)}</p></div>
          <div><p className="text-muted-foreground">Remaining balance</p><p className="font-semibold">{money(Number(plan.total_amount) - totalPaid, plan.currency)}</p></div>
          {next && <>
            <div><p className="text-muted-foreground">Next payment due</p><p className="font-semibold">{fmtDate(next.due_date)}</p></div>
            <div><p className="text-muted-foreground">Next payment</p><p className="text-lg font-bold">{money(next.amount, plan.currency)}</p></div>
          </>}
        </div>

        {plan.payment_instructions && (
          <p className="mt-4 whitespace-pre-line rounded-lg bg-muted p-3 text-sm">{plan.payment_instructions}</p>
        )}

        {next ? (onPay && (
          <Button className="mt-4 w-full rounded-full" size="lg" onClick={() => onPay(next)}>
            Make payment
          </Button>
        )) : <p className="mt-4 text-center text-sm font-semibold text-success">All instalments paid — thank you!</p>}
      </CardContent>
    </Card>
  );
}
