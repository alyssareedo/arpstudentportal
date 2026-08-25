import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sync-secret",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SETTING_KEY = "google_sheets_sync";
const CRON_KEY = "google_sheets_cron";
const MAX_ROWS = 5000;

// Tables exported to the spreadsheet (one tab each).
const TABLES = [
  "profiles",
  "user_roles",
  "lessons",
  "homework",
  "scores",
  "bookings",
  "availability_slots",
  "availability_blocks",
  "course_enrollments",
  "course_packages",
  "course_offers",
  "invoices",
  "invoice_payments",
  "materials",
  "material_categories",
  "material_assignments",
  "material_progress",
  "news_links",
  "teacher_assignments",
  "student_notes",
  "cefr_assessments",
  "cefr_assessment_answers",
  "toeic_assessments",
  "toeic_assessment_answers",
  "assessment_comments",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function sheetsHeaders() {
  return {
    Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
    "X-Connection-Api-Key": `${Deno.env.get("GOOGLE_SHEETS_API_KEY")}`,
    "Content-Type": "application/json",
  };
}

async function sheetsCall(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    headers: sheetsHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`Sheets request failed [${res.status}] ${method} ${path}: ${text}`);
    throw new Error(`[${res.status}] ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

function toCell(v: unknown): string | number | boolean {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 4000 ? s.slice(0, 4000) : s;
}

function colLetter(n: number) {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function quoteTab(title: string) {
  return `'${title.replace(/'/g, "''")}'`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, serviceKey);

  let runId: string | null = null;
  let mode = "manual";

  try {
    if (!Deno.env.get("LOVABLE_API_KEY") || !Deno.env.get("GOOGLE_SHEETS_API_KEY")) {
      return json({ error: "Google Sheets connection is not configured" }, 500);
    }

    // ---- auth: admin JWT, or the scheduled job's shared secret ----
    const cronSecret = req.headers.get("x-sync-secret");
    let actor = "scheduler";
    let actorId: string | null = null;

    if (cronSecret) {
      const { data: cronSetting } = await admin
        .from("app_settings").select("value").eq("key", CRON_KEY).maybeSingle();
      const expected = (cronSetting?.value as any)?.secret;
      if (!expected || expected !== cronSecret) return json({ error: "Unauthorized" }, 401);
      mode = "scheduled";
    } else {
      const userClient = createClient(url, anonKey, {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (!u.user) return json({ error: "Unauthorized" }, 401);
      const { data: isAdmin } = await admin
        .from("user_roles").select("id").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (!isAdmin) return json({ error: "Admin only" }, 403);
      actor = u.user.email ?? u.user.id;
      actorId = u.user.id;
    }

    // ---- request options ----
    let requestedId: string | undefined;
    let forceFull = false;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.spreadsheet_id === "string" && body.spreadsheet_id.trim()) {
          requestedId = body.spreadsheet_id.trim();
        }
        if (body?.full === true) forceFull = true;
      } catch (_) { /* no body */ }
    }

    const { data: setting } = await admin
      .from("app_settings").select("value").eq("key", SETTING_KEY).maybeSingle();
    const stored = (setting?.value ?? {}) as { spreadsheet_id?: string; url?: string };

    let defaultSpreadsheetId = requestedId ?? stored.spreadsheet_id;
    let defaultUrl = stored.url;

    if (!defaultSpreadsheetId) {
      const created = await sheetsCall("/spreadsheets", "POST", {
        properties: { title: "ARP Speak — Live Data Export" },
      });
      defaultSpreadsheetId = created.spreadsheetId;
      defaultUrl = created.spreadsheetUrl;
    }

    // ---- targets (seed defaults on first run) ----
    let { data: targets } = await admin.from("sheet_sync_targets").select("*");
    if (!targets || targets.length === 0) {
      await admin.from("sheet_sync_targets").insert(
        TABLES.map((t) => ({ table_name: t, tab_name: t, enabled: true, incremental: true })),
      );
      const again = await admin.from("sheet_sync_targets").select("*");
      targets = again.data ?? [];
    }
    const active = targets.filter((t: any) => t.enabled);

    // ---- start run record ----
    const startedAt = new Date().toISOString();
    const { data: run } = await admin.from("sheet_sync_runs").insert({
      started_at: startedAt,
      status: "running",
      mode,
      sync_type: forceFull ? "full" : "incremental",
      triggered_by: actorId,
      details: { actor },
    }).select("id").single();
    runId = run?.id ?? null;

    const results: Record<string, any> = {};
    let rowsPushed = 0;
    let tablesSynced = 0;
    const failures: string[] = [];
    const now = new Date().toISOString();

    // group targets per spreadsheet so tab creation is batched
    const bySheet = new Map<string, any[]>();
    for (const t of active) {
      const sid = t.spreadsheet_id || defaultSpreadsheetId!;
      if (!bySheet.has(sid)) bySheet.set(sid, []);
      bySheet.get(sid)!.push(t);
    }

    for (const [spreadsheetId, group] of bySheet) {
      let existing: string[] = [];
      try {
        const meta = await sheetsCall(
          `/spreadsheets/${spreadsheetId}?fields=spreadsheetUrl,sheets.properties.title`,
        );
        existing = (meta.sheets ?? []).map((s: any) => s.properties.title);
        if (spreadsheetId === defaultSpreadsheetId) defaultUrl = meta.spreadsheetUrl ?? defaultUrl;
      } catch (e) {
        for (const t of group) {
          results[t.table_name] = { error: String(e instanceof Error ? e.message : e) };
          failures.push(`${t.table_name}: spreadsheet unreachable`);
        }
        continue;
      }

      const missing = group.map((t: any) => t.tab_name).filter((n: string) => !existing.includes(n));
      if (missing.length) {
        await sheetsCall(`/spreadsheets/${spreadsheetId}:batchUpdate`, "POST", {
          requests: [...new Set(missing)].map((title) => ({ addSheet: { properties: { title } } })),
        });
      }

      for (const t of group) {
        const table = t.table_name;
        const tab = t.tab_name;
        const isNewTab = missing.includes(tab);
        const incremental = !forceFull && t.incremental && !!t.last_synced_at && !isNewTab;

        try {
          // fetch rows
          let query = admin.from(table).select("*").limit(MAX_ROWS);
          if (incremental) {
            query = admin
              .from(table)
              .select("*")
              .or(`updated_at.gte.${t.last_synced_at},created_at.gte.${t.last_synced_at}`)
              .limit(MAX_ROWS);
          }
          let { data, error } = await query;
          if (error && incremental) {
            // table has no updated_at/created_at — fall back to a full refresh
            const full = await admin.from(table).select("*").limit(MAX_ROWS);
            data = full.data;
            error = full.error;
            if (!error) {
              await writeFull(spreadsheetId, tab, data ?? []);
              rowsPushed += (data ?? []).length;
              tablesSynced++;
              results[table] = { mode: "full (no timestamp column)", rows: (data ?? []).length };
              await admin.from("sheet_sync_targets").update({
                last_synced_at: now, last_row_count: (data ?? []).length,
              }).eq("id", t.id);
              continue;
            }
          }
          if (error) throw new Error(error.message);
          const rows = data ?? [];

          if (!incremental) {
            await writeFull(spreadsheetId, tab, rows);
            rowsPushed += rows.length;
            results[table] = { mode: "full", rows: rows.length };
          } else if (rows.length === 0) {
            results[table] = { mode: "incremental", rows: 0, changed: 0 };
          } else {
            const changed = await writeIncremental(spreadsheetId, tab, rows);
            rowsPushed += rows.length;
            results[table] = { mode: "incremental", rows: rows.length, ...changed };
          }

          tablesSynced++;
          await admin.from("sheet_sync_targets").update({
            last_synced_at: now,
            last_row_count: incremental ? (t.last_row_count ?? 0) : rows.length,
          }).eq("id", t.id);
        } catch (e) {
          const msg = String(e instanceof Error ? e.message : e);
          console.error(`Sync failed for ${table}: ${msg}`);
          results[table] = { error: msg };
          failures.push(`${table}: ${msg}`);
        }
      }
    }

    const finishedAt = new Date().toISOString();
    const status = failures.length === 0 ? "success" : (tablesSynced > 0 ? "partial" : "failed");

    if (runId) {
      await admin.from("sheet_sync_runs").update({
        finished_at: finishedAt,
        status,
        tables_synced: tablesSynced,
        rows_pushed: rowsPushed,
        error: failures.length ? failures.join("\n") : null,
        details: { actor, results },
      }).eq("id", runId);
    }

    await admin.from("app_settings").upsert({
      key: SETTING_KEY,
      value: {
        spreadsheet_id: defaultSpreadsheetId,
        url: defaultUrl,
        last_synced_at: finishedAt,
        last_synced_by: actor,
        last_status: status,
      },
      updated_at: finishedAt,
    }, { onConflict: "key" });

    return json({
      ok: failures.length === 0,
      status,
      spreadsheet_id: defaultSpreadsheetId,
      url: defaultUrl,
      synced_at: finishedAt,
      tables: tablesSynced,
      rows: rowsPushed,
      errors: failures,
      results,
    });
  } catch (e) {
    const msg = String(e instanceof Error ? e.message : e);
    console.error("sync-google-sheets failed:", msg);
    if (runId) {
      await admin.from("sheet_sync_runs").update({
        finished_at: new Date().toISOString(),
        status: "failed",
        error: msg,
      }).eq("id", runId);
    }
    return json({ error: msg }, 500);
  }
});

// --- write helpers -------------------------------------------------------

async function writeFull(spreadsheetId: string, tab: string, rows: any[]) {
  const columns = rows.length ? Object.keys(rows[0]) : ["(no rows)"];
  const values = [columns, ...rows.map((r) => columns.map((c) => toCell(r[c])))];
  await sheetsCall(`/spreadsheets/${spreadsheetId}/values:batchClear`, "POST", {
    ranges: [`${quoteTab(tab)}!A1:ZZ50000`],
  });
  await sheetsCall(`/spreadsheets/${spreadsheetId}/values:batchUpdate`, "POST", {
    valueInputOption: "RAW",
    data: [{ range: `${quoteTab(tab)}!A1`, majorDimension: "ROWS", values }],
  });
}

/** Upsert only changed rows, matching on the id in column A. */
async function writeIncremental(spreadsheetId: string, tab: string, rows: any[]) {
  const header = await sheetsCall(
    `/spreadsheets/${spreadsheetId}/values/${quoteTab(tab)}!A1:ZZ1`,
  );
  let columns: string[] = header.values?.[0] ?? [];
  if (!columns.length || columns[0] === "(no rows)") {
    await writeFull(spreadsheetId, tab, rows);
    return { updated: 0, appended: rows.length, rewritten: true };
  }
  // add any brand-new columns at the end
  const rowKeys = Object.keys(rows[0]);
  const newCols = rowKeys.filter((k) => !columns.includes(k));
  if (newCols.length) {
    columns = [...columns, ...newCols];
    await sheetsCall(`/spreadsheets/${spreadsheetId}/values:batchUpdate`, "POST", {
      valueInputOption: "RAW",
      data: [{ range: `${quoteTab(tab)}!A1`, majorDimension: "ROWS", values: [columns] }],
    });
  }

  const keyCol = columns.includes("id") ? "id" : columns[0];
  const keyIndex = columns.indexOf(keyCol);
  const keyLetter = colLetter(keyIndex + 1);
  const existing = await sheetsCall(
    `/spreadsheets/${spreadsheetId}/values/${quoteTab(tab)}!${keyLetter}2:${keyLetter}50000`,
  );
  const keyToRow = new Map<string, number>();
  (existing.values ?? []).forEach((r: any[], i: number) => {
    const v = r?.[0];
    if (v !== undefined && v !== "") keyToRow.set(String(v), i + 2);
  });

  const lastLetter = colLetter(columns.length);
  const updates: { range: string; majorDimension: string; values: any[][] }[] = [];
  const appends: any[][] = [];

  for (const r of rows) {
    const line = columns.map((c) => toCell(r[c]));
    const key = r[keyCol] !== undefined && r[keyCol] !== null ? String(r[keyCol]) : null;
    const rowNum = key ? keyToRow.get(key) : undefined;
    if (rowNum) {
      updates.push({
        range: `${quoteTab(tab)}!A${rowNum}:${lastLetter}${rowNum}`,
        majorDimension: "ROWS",
        values: [line],
      });
    } else {
      appends.push(line);
    }
  }

  if (updates.length) {
    for (let i = 0; i < updates.length; i += 200) {
      await sheetsCall(`/spreadsheets/${spreadsheetId}/values:batchUpdate`, "POST", {
        valueInputOption: "RAW",
        data: updates.slice(i, i + 200),
      });
    }
  }
  if (appends.length) {
    await sheetsCall(
      `/spreadsheets/${spreadsheetId}/values/${quoteTab(tab)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
      "POST",
      { majorDimension: "ROWS", values: appends },
    );
  }

  return { updated: updates.length, appended: appends.length };
}
