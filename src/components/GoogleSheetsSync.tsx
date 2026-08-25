import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Clock, ExternalLink, RefreshCw, Sheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type SyncSetting = {
  spreadsheet_id?: string;
  url?: string;
  last_synced_at?: string;
  last_synced_by?: string;
  last_status?: string;
};

type Target = {
  id: string;
  table_name: string;
  tab_name: string;
  spreadsheet_id: string | null;
  enabled: boolean;
  incremental: boolean;
  last_synced_at: string | null;
};

type Run = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  mode: string;
  sync_type: string;
  tables_synced: number;
  rows_pushed: number;
  error: string | null;
};

const INTERVALS = [5, 15, 30, 60, 180, 360, 720, 1440];

function intervalLabel(m: number) {
  if (m < 60) return `Every ${m} minutes`;
  if (m === 60) return "Every hour";
  if (m < 1440) return `Every ${m / 60} hours`;
  return "Once a day";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    partial: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    failed: "bg-destructive/15 text-destructive border-destructive/30",
    running: "bg-primary/15 text-primary border-primary/30",
  };
  return (
    <Badge variant="outline" className={map[status] ?? ""}>
      {status}
    </Badge>
  );
}

export function GoogleSheetsSync() {
  const [setting, setSetting] = useState<SyncSetting | null>(null);
  const [sheetId, setSheetId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoMinutes, setAutoMinutes] = useState(15);
  const [savingAuto, setSavingAuto] = useState(false);

  const loadAll = useCallback(async () => {
    const [settingRes, targetsRes, runsRes, autoRes] = await Promise.all([
      supabase.from("app_settings").select("value").eq("key", "google_sheets_sync").maybeSingle(),
      supabase.from("sheet_sync_targets").select("*").order("table_name"),
      supabase.from("sheet_sync_runs").select("*").order("started_at", { ascending: false }).limit(10),
      supabase.rpc("get_sheets_autosync"),
    ]);
    setSetting((settingRes.data?.value as SyncSetting) ?? null);
    setTargets((targetsRes.data as Target[]) ?? []);
    setRuns((runsRes.data as Run[]) ?? []);
    const auto = autoRes.data as { enabled?: boolean; minutes?: number } | null;
    if (auto) {
      setAutoEnabled(!!auto.enabled);
      setAutoMinutes(auto.minutes ?? 15);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function sync(full: boolean) {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-sheets", {
        body: {
          ...(sheetId.trim() ? { spreadsheet_id: sheetId.trim() } : {}),
          ...(full ? { full: true } : {}),
        },
      });
      if (error) throw error;
      const res = data as any;
      if (res?.error) throw new Error(res.error);
      setSheetId("");
      if (res.errors?.length) {
        toast.warning(`Synced ${res.tables} tabs with ${res.errors.length} error(s)`);
      } else {
        toast.success(`Synced ${res.tables} tabs (${res.rows} rows) to Google Sheets`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    } finally {
      setSyncing(false);
      loadAll();
    }
  }

  async function saveAuto(enabled: boolean, minutes: number) {
    setSavingAuto(true);
    try {
      const { error } = await supabase.rpc("configure_sheets_autosync", {
        _enabled: enabled,
        _minutes: minutes,
      });
      if (error) throw error;
      setAutoEnabled(enabled);
      setAutoMinutes(minutes);
      toast.success(enabled ? `Automatic sync ${intervalLabel(minutes).toLowerCase()}` : "Automatic sync off");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update the schedule");
    } finally {
      setSavingAuto(false);
    }
  }

  async function updateTarget(id: string, patch: Partial<Target>) {
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await supabase.from("sheet_sync_targets").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sheet className="h-5 w-5 text-primary" />
            Google Sheets export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pushes your data into Google Sheets, one tab per table. Incremental syncs only send rows
            that changed since the last successful run; a full refresh rewrites every tab.
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
                  {setting.last_status ? ` — ${setting.last_status}` : ""}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="sheet-id">Default spreadsheet (optional)</Label>
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

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => sync(false)}
              disabled={syncing}
              className="gradient-primary text-primary-foreground shadow-glow"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync changes"}
            </Button>
            <Button variant="outline" onClick={() => sync(true)} disabled={syncing}>
              Full refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Automatic background sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
            <div>
              <p className="text-sm font-medium">Keep Google Sheets up to date automatically</p>
              <p className="text-xs text-muted-foreground">
                Runs an incremental sync in the background, even when you are not signed in.
              </p>
            </div>
            <Switch
              checked={autoEnabled}
              disabled={savingAuto}
              onCheckedChange={(v) => saveAuto(v, autoMinutes)}
            />
          </div>
          <div className="grid gap-2 sm:max-w-xs">
            <Label>Frequency</Label>
            <Select
              value={String(autoMinutes)}
              onValueChange={(v) => saveAuto(autoEnabled, Number(v))}
              disabled={savingAuto}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTERVALS.map((m) => (
                  <SelectItem key={m} value={String(m)}>{intervalLabel(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-elegant">
        <CardHeader>
          <CardTitle>Sync history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {runs.length === 0 && (
            <p className="text-sm text-muted-foreground">No syncs have run yet.</p>
          )}
          {runs.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                {r.status === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : r.status === "running" ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm font-medium">
                  {new Date(r.started_at).toLocaleString()}
                </span>
                <StatusBadge status={r.status} />
                <Badge variant="secondary">{r.mode}</Badge>
                <Badge variant="secondary">{r.sync_type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {r.tables_synced} tabs · {r.rows_pushed} rows
                </span>
              </div>
              {r.error && (
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                  {r.error}
                </pre>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-elegant">
        <CardHeader>
          <CardTitle>Table mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Choose which tables sync, the tab they write to, and optionally a different spreadsheet
            per table. Leave the spreadsheet blank to use the default above.
          </p>
          {targets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Run a sync once to create the default mapping for every table.
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {targets.map((t) => (
                <AccordionItem key={t.id} value={t.id}>
                  <AccordionTrigger className="text-sm">
                    <span className="flex flex-1 items-center gap-2 pr-2 text-left">
                      <span className="font-medium">{t.table_name}</span>
                      <span className="text-xs text-muted-foreground">→ {t.tab_name}</span>
                      {!t.enabled && <Badge variant="outline">off</Badge>}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="grid gap-2">
                      <Label>Tab name</Label>
                      <Input
                        value={t.tab_name}
                        onChange={(e) =>
                          setTargets((prev) =>
                            prev.map((x) => (x.id === t.id ? { ...x, tab_name: e.target.value } : x)))
                        }
                        onBlur={(e) => updateTarget(t.id, { tab_name: e.target.value.trim() || t.table_name })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Spreadsheet ID (optional)</Label>
                      <Input
                        placeholder="Uses the default spreadsheet"
                        value={t.spreadsheet_id ?? ""}
                        onChange={(e) =>
                          setTargets((prev) =>
                            prev.map((x) => (x.id === t.id ? { ...x, spreadsheet_id: e.target.value } : x)))
                        }
                        onBlur={(e) => updateTarget(t.id, { spreadsheet_id: e.target.value.trim() || null })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Include in sync</span>
                      <Switch
                        checked={t.enabled}
                        onCheckedChange={(v) => updateTarget(t.id, { enabled: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Incremental (changed rows only)</span>
                      <Switch
                        checked={t.incremental}
                        onCheckedChange={(v) => updateTarget(t.id, { incremental: v })}
                      />
                    </div>
                    {t.last_synced_at && (
                      <p className="text-xs text-muted-foreground">
                        Last synced {new Date(t.last_synced_at).toLocaleString()}
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
