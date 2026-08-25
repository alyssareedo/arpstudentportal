import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ExternalLink, RefreshCw, Sheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type SyncSetting = {
  spreadsheet_id?: string;
  url?: string;
  last_synced_at?: string;
  last_synced_by?: string;
};

export function GoogleSheetsSync() {
  const [setting, setSetting] = useState<SyncSetting | null>(null);
  const [sheetId, setSheetId] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "google_sheets_sync")
      .maybeSingle()
      .then(({ data }) => setSetting((data?.value as SyncSetting) ?? null));
  }, []);

  async function sync() {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
        body: sheetId.trim() ? { spreadsheet_id: sheetId.trim() } : {},
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSetting({
        spreadsheet_id: (data as any).spreadsheet_id,
        url: (data as any).url,
        last_synced_at: (data as any).synced_at,
      });
      setSheetId("");
      toast.success(`Synced ${(data as any).tables} tabs to Google Sheets`);
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card className="border-border/60 shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sheet className="h-5 w-5 text-primary" />
          Google Sheets export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Pushes every table — students, lessons, invoices, materials, assessments and more —
          into one Google spreadsheet, one tab per table. Each sync overwrites the tabs with
          the latest data.
        </p>

        {setting?.url && (
          <div className="rounded-xl border border-border/60 p-3 text-sm">
            <a
              href={setting.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              Open spreadsheet <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {setting.last_synced_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                Last synced {new Date(setting.last_synced_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="sheet-id">Use an existing spreadsheet (optional)</Label>
          <Input
            id="sheet-id"
            placeholder="Paste a Google spreadsheet ID to sync into it"
            value={sheetId}
            onChange={(e) => setSheetId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to keep using the spreadsheet above, or create a new one on first sync.
          </p>
        </div>

        <Button
          onClick={sync}
          disabled={syncing}
          className="gradient-primary text-primary-foreground shadow-glow"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing…" : "Update Google Sheets"}
        </Button>
      </CardContent>
    </Card>
  );
}
