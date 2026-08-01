import { useCallback, useEffect, useState } from "react";
import { Plus, Tag, Sparkles, Pencil, Star, Clock } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface CourseOffer {
  id: string;
  title: string;
  period_label: string | null;
  description: string | null;
  lessons_count: number | null;
  lesson_minutes: number | null;
  price: number;
  original_price: number | null;
  currency: string;
  promo_tag: string | null;
  is_promotion: boolean;
  is_active: boolean;
  featured: boolean;
  sort_order: number;
  valid_from: string | null;
  valid_until: string | null;
}

const empty = {
  title: "",
  period_label: "",
  description: "",
  lessons_count: "",
  lesson_minutes: "60",
  price: "",
  original_price: "",
  currency: "THB",
  promo_tag: "",
  is_promotion: false,
  is_active: true,
  featured: false,
  sort_order: "0",
  valid_from: "",
  valid_until: "",
};

function money(v: number, currency: string) {
  return `${currency} ${Number(v).toLocaleString()}`;
}

function OfferDialog({ offer, onSaved }: { offer?: CourseOffer; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ ...empty });

  useEffect(() => {
    if (!open) return;
    setF(offer
      ? {
          title: offer.title,
          period_label: offer.period_label ?? "",
          description: offer.description ?? "",
          lessons_count: offer.lessons_count?.toString() ?? "",
          lesson_minutes: offer.lesson_minutes?.toString() ?? "60",
          price: offer.price?.toString() ?? "",
          original_price: offer.original_price?.toString() ?? "",
          currency: offer.currency,
          promo_tag: offer.promo_tag ?? "",
          is_promotion: offer.is_promotion,
          is_active: offer.is_active,
          featured: offer.featured,
          sort_order: String(offer.sort_order ?? 0),
          valid_from: offer.valid_from ?? "",
          valid_until: offer.valid_until ?? "",
        }
      : { ...empty });
  }, [open, offer]);

  const save = async () => {
    if (!f.title.trim()) return toast.error("Title is required");
    setBusy(true);
    const payload = {
      title: f.title.trim(),
      period_label: f.period_label.trim() || null,
      description: f.description.trim() || null,
      lessons_count: f.lessons_count ? Number(f.lessons_count) : null,
      lesson_minutes: f.lesson_minutes ? Number(f.lesson_minutes) : null,
      price: Number(f.price || 0),
      original_price: f.original_price ? Number(f.original_price) : null,
      currency: f.currency.trim() || "THB",
      promo_tag: f.promo_tag.trim() || null,
      is_promotion: f.is_promotion,
      is_active: f.is_active,
      featured: f.featured,
      sort_order: Number(f.sort_order || 0),
      valid_from: f.valid_from || null,
      valid_until: f.valid_until || null,
    };
    const { error } = offer
      ? await supabase.from("course_offers").update(payload).eq("id", offer.id)
      : await supabase.from("course_offers").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(offer ? "Updated" : "Created");
    setOpen(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {offer ? (
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
        ) : (
          <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> New package</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{offer ? "Edit package" : "New package"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Title</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="10-lesson Speaking Package" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Period / month</Label><Input value={f.period_label} onChange={(e) => setF({ ...f, period_label: e.target.value })} placeholder="August 2026" /></div>
            <div><Label>Promo tag</Label><Input value={f.promo_tag} onChange={(e) => setF({ ...f, promo_tag: e.target.value })} placeholder="Save 20%" /></div>
          </div>
          <div><Label>Description</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="What's included…" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Lessons</Label><Input type="number" min="0" value={f.lessons_count} onChange={(e) => setF({ ...f, lessons_count: e.target.value })} /></div>
            <div><Label>Minutes / lesson</Label><Input type="number" min="0" value={f.lesson_minutes} onChange={(e) => setF({ ...f, lesson_minutes: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Price</Label><Input type="number" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
            <div><Label>Was (optional)</Label><Input type="number" min="0" value={f.original_price} onChange={(e) => setF({ ...f, original_price: e.target.value })} /></div>
            <div><Label>Currency</Label><Input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Valid from</Label><Input type="date" value={f.valid_from} onChange={(e) => setF({ ...f, valid_from: e.target.value })} /></div>
            <div><Label>Valid until</Label><Input type="date" value={f.valid_until} onChange={(e) => setF({ ...f, valid_until: e.target.value })} /></div>
          </div>
          <div><Label>Sort order</Label><Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} /></div>
          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_promotion} onCheckedChange={(v) => setF({ ...f, is_promotion: v })} /> Promotion</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.featured} onCheckedChange={(v) => setF({ ...f, featured: v })} /> Featured</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} /> Visible to students</label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={busy} className="rounded-full">{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OfferCard({ o, isAdmin, onChanged }: { o: CourseOffer; isAdmin: boolean; onChanged: () => void }) {
  const remove = async () => {
    const { error } = await supabase.from("course_offers").delete().eq("id", o.id);
    if (error) throw error;
    toast.success("Deleted");
    onChanged();
  };
  return (
    <Card className={`border-border/60 shadow-elegant ${o.featured ? "ring-2 ring-primary" : ""} ${o.is_active ? "" : "opacity-60"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{o.title}</CardTitle>
            {o.period_label && <p className="text-xs text-muted-foreground">{o.period_label}</p>}
          </div>
          {isAdmin && (
            <div className="flex items-center">
              <OfferDialog offer={o} onSaved={onChanged} />
              <ConfirmDeleteButton onConfirm={remove} title="Delete this package?" description="Students will no longer see this pricing option." />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {o.is_promotion && <Badge className="rounded-full bg-accent text-accent-foreground hover:bg-accent"><Sparkles className="mr-1 h-3 w-3" />Promotion</Badge>}
          {o.promo_tag && <Badge variant="outline" className="rounded-full"><Tag className="mr-1 h-3 w-3" />{o.promo_tag}</Badge>}
          {o.featured && <Badge variant="secondary" className="rounded-full"><Star className="mr-1 h-3 w-3" />Popular</Badge>}
          {isAdmin && !o.is_active && <Badge variant="outline" className="rounded-full">Hidden</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{money(o.price, o.currency)}</span>
          {o.original_price ? <span className="text-sm text-muted-foreground line-through">{money(o.original_price, o.currency)}</span> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {o.lessons_count ? `${o.lessons_count} lessons` : "Flexible"}{o.lesson_minutes ? ` · ${o.lesson_minutes} min each` : ""}
          {o.lessons_count && o.price ? ` · ${money(Math.round(o.price / o.lessons_count), o.currency)} per lesson` : ""}
        </p>
        {o.description && <p className="whitespace-pre-wrap text-sm">{o.description}</p>}
        {(o.valid_from || o.valid_until) && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {o.valid_from ?? "—"} → {o.valid_until ?? "—"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Pricing() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [offers, setOffers] = useState<CourseOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("course_offers")
      .select("*")
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setOffers((data as CourseOffer[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const promos = offers.filter((o) => o.is_promotion);
  const regular = offers.filter((o) => !o.is_promotion);

  const grid = (items: CourseOffer[], emptyText: string) =>
    items.length === 0
      ? <p className="py-12 text-center text-sm text-muted-foreground">{emptyText}</p>
      : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((o) => <OfferCard key={o.id} o={o} isAdmin={isAdmin} onChanged={load} />)}</div>;

  if (loading) return <p className="text-center text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Promotions &amp; Pricing</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Create monthly promotions and regular course packages students can choose from." : "Choose the package that fits you best — contact us to enrol."}
          </p>
        </div>
        {isAdmin && <OfferDialog onSaved={load} />}
      </div>

      <Tabs defaultValue="promotions">
        <TabsList className="rounded-full">
          <TabsTrigger value="promotions" className="rounded-full">Promotions ({promos.length})</TabsTrigger>
          <TabsTrigger value="regular" className="rounded-full">Regular prices ({regular.length})</TabsTrigger>
          <TabsTrigger value="all" className="rounded-full">All ({offers.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="promotions" className="pt-4">{grid(promos, "No promotions right now.")}</TabsContent>
        <TabsContent value="regular" className="pt-4">{grid(regular, "No regular packages yet.")}</TabsContent>
        <TabsContent value="all" className="pt-4">{grid(offers, "Nothing here yet.")}</TabsContent>
      </Tabs>
    </div>
  );
}
