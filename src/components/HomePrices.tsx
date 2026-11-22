import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Offer = { id: string; title: string; period_label: string | null; description: string | null; lessons_count: number | null; lesson_minutes: number | null; price: number; original_price: number | null; currency: string; promo_tag: string | null; featured: boolean };

export function HomePrices({ heading }: { heading: string }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  useEffect(() => {
    supabase.from("course_offers").select("id,title,period_label,description,lessons_count,lesson_minutes,price,original_price,currency,promo_tag,featured")
      .eq("is_active", true).eq("archived", false).order("sort_order").then(({ data }) => setOffers((data as Offer[]) ?? []));
  }, []);
  if (!offers.length) return null;
  return (
    <section id="prices" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-extrabold">{heading}</h2>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((o) => (
          <Card key={o.id} className={o.featured ? "border-primary shadow-elegant" : ""}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold">{o.title}</h3>
                {o.promo_tag && <Badge>{o.promo_tag}</Badge>}
              </div>
              {o.period_label && <p className="text-sm text-muted-foreground">{o.period_label}</p>}
              <p className="mt-4 text-3xl font-extrabold">
                {Number(o.price).toLocaleString()} <span className="text-base font-medium">{o.currency}</span>
              </p>
              {o.original_price && <p className="text-sm text-muted-foreground line-through">{Number(o.original_price).toLocaleString()} {o.currency}</p>}
              {(o.lessons_count || o.lesson_minutes) && (
                <p className="mt-2 text-sm">{o.lessons_count ? `${o.lessons_count} lessons` : ""}{o.lessons_count && o.lesson_minutes ? " · " : ""}{o.lesson_minutes ? `${o.lesson_minutes} min each` : ""}</p>
              )}
              {o.description && <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{o.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
