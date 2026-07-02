import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Receipt, Download, Upload } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600",
  partial: "bg-blue-500/10 text-blue-600",
  paid: "bg-green-500/10 text-green-600",
  overdue: "bg-red-500/10 text-red-600",
  cancelled: "bg-gray-500/10 text-gray-600",
};

export default function MyInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [proofFor, setProofFor] = useState<any>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [amount, setAmount] = useState("");

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoading(true);
    const [{ data: inv }, { data: pays }] = await Promise.all([
      supabase.from("invoices").select("*").eq("student_id", user!.id).order("issue_date", { ascending: false }),
      supabase.from("invoice_payments").select("*"),
    ]);
    setInvoices(inv ?? []);
    setPayments(pays ?? []);
    setLoading(false);
  };

  const downloadPdf = async (path: string) => {
    const { data } = await supabase.storage.from("invoices").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const uploadProof = async () => {
    if (!proofFor || !proofFile || !amount) return toast.error("Amount and file required");
    const path = `${user!.id}/proof-${crypto.randomUUID()}-${proofFile.name}`;
    const { error: upErr } = await supabase.storage.from("invoices").upload(path, proofFile);
    if (upErr) return toast.error(upErr.message);
    const { error } = await supabase.from("invoice_payments").insert({
      invoice_id: proofFor.id, amount: Number(amount), proof_path: path, uploaded_by: user!.id, method: "student proof",
    });
    if (error) return toast.error(error.message);
    toast.success("Payment proof submitted — awaiting admin confirmation.");
    setProofFor(null); setProofFile(null); setAmount("");
    load();
  };

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> My invoices</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <p>Loading…</p> : invoices.length === 0 ? <p className="text-muted-foreground">No invoices yet.</p> : (
          <div className="space-y-2">
            {invoices.map(i => {
              const paidSum = payments.filter(p => p.invoice_id === i.id).reduce((s, p) => s + Number(p.amount), 0);
              return (
                <div key={i.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{i.invoice_number}</div>
                      <div className="text-xs text-muted-foreground">{i.package_name} · {i.issue_date}{i.due_date ? ` → due ${i.due_date}` : ""}</div>
                    </div>
                    <Badge variant="outline" className={STATUS_COLORS[i.status]}>{i.status}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm">Total: <b>{Number(i.total).toLocaleString()} {i.currency}</b> · Paid: {paidSum.toLocaleString()}</div>
                    <div className="flex gap-2">
                      {i.pdf_path && <Button size="sm" variant="outline" onClick={() => downloadPdf(i.pdf_path)}><Download className="mr-1.5 h-3.5 w-3.5" /> PDF</Button>}
                      {i.status !== "paid" && i.status !== "cancelled" && (
                        <Dialog open={proofFor?.id === i.id} onOpenChange={(o) => { if (!o) { setProofFor(null); setProofFile(null); setAmount(""); } }}>
                          <DialogTrigger asChild><Button size="sm" onClick={() => { setProofFor(i); setAmount(String(Number(i.total) - paidSum)); }}><Upload className="mr-1.5 h-3.5 w-3.5" /> Upload proof</Button></DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Upload payment proof</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div><Label>Amount</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                              <div><Label>File</Label><Input type="file" accept="image/*,application/pdf" onChange={e => setProofFile(e.target.files?.[0] ?? null)} /></div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setProofFor(null)}>Cancel</Button>
                              <Button onClick={uploadProof}>Submit</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
