import { Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";
import { useSiteContent } from "@/lib/siteContent";
import { supabase } from "@/integrations/supabase/client";

/** Welcome message and announcements set by the admin on the Home page editor. */
export function PortalNotices() {
  const c = useSiteContent();
  const items = [...c.announcements].filter((a) => a.title || a.body).sort((a, b) => b.date.localeCompare(a.date));
  const ids = items.map((a) => a.id).join(",");
  useEffect(() => {
    if (!ids) return;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      const rows = ids.split(",").map((announcement_id) => ({ announcement_id, student_id: uid }));
      await supabase.from("announcement_reads").upsert(rows, { onConflict: "announcement_id,student_id", ignoreDuplicates: true });
    })();
  }, [ids]);
  if (!c.welcome_title && !c.welcome_text && items.length === 0) return null;
  return (
    <div className="space-y-3">
      {(c.welcome_title || c.welcome_text) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-5">
            {c.welcome_title && <h2 className="text-lg font-bold">{c.welcome_title}</h2>}
            {c.welcome_text && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{c.welcome_text}</p>}
          </CardContent>
        </Card>
      )}
      {items.map((a) => (
        <Card key={a.id}>
          <CardContent className="flex gap-3 p-4">
            <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold">{a.title}</span>
                {a.date && <span className="text-xs text-muted-foreground">{new Date(a.date).toLocaleDateString()}</span>}
              </div>
              {a.body && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
