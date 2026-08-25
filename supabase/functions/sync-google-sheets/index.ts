import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SETTING_KEY = "google_sheets_sync";
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!Deno.env.get("LOVABLE_API_KEY") || !Deno.env.get("GOOGLE_SHEETS_API_KEY")) {
      return json({ error: "Google Sheets connection is not configured" }, 500);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: isAdmin } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) return json({ error: "Admin only" }, 403);

    // Optional override so the admin can point the sync at their own sheet.
    let requestedId: string | undefined;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.spreadsheet_id === "string" && body.spreadsheet_id.trim()) {
          requestedId = body.spreadsheet_id.trim();
        }
      } catch (_) { /* no body */ }
    }

    const { data: setting } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", SETTING_KEY)
      .maybeSingle();

    const stored = (setting?.value ?? {}) as { spreadsheet_id?: string; url?: string };
    let spreadsheetId = requestedId ?? stored.spreadsheet_id;
    let spreadsheetUrl = stored.url;

    if (!spreadsheetId) {
      const created = await sheetsCall("/spreadsheets", "POST", {
        properties: { title: "ARP Speak — Live Data Export" },
      });
      spreadsheetId = created.spreadsheetId;
      spreadsheetUrl = created.spreadsheetUrl;
    }

    // Existing tabs
    const meta = await sheetsCall(
      `/spreadsheets/${spreadsheetId}?fields=spreadsheetUrl,sheets.properties.title`,
    );
    spreadsheetUrl = meta.spreadsheetUrl ?? spreadsheetUrl;
    const existing: string[] = (meta.sheets ?? []).map((s: any) => s.properties.title);

    // Pull data first so we only create tabs we can fill.
    const payloads: { title: string; values: (string | number | boolean)[][] }[] = [];
    const counts: Record<string, number> = {};

    for (const table of TABLES) {
      const { data, error } = await admin.from(table).select("*").limit(MAX_ROWS);
      if (error) {
        console.error(`Skipping ${table}: ${error.message}`);
        continue;
      }
      const rows = data ?? [];
      counts[table] = rows.length;
      const columns = rows.length
        ? Object.keys(rows[0] as Record<string, unknown>)
        : ["(no rows)"];
      const values = [columns, ...rows.map((r: any) => columns.map((c) => toCell(r[c])))];
      payloads.push({ title: table, values });
    }

    const missing = payloads.map((p) => p.title).filter((t) => !existing.includes(t));
    const summaryTitle = "Summary";
    if (!existing.includes(summaryTitle) && !missing.includes(summaryTitle)) {
      missing.push(summaryTitle);
    }
    if (missing.length) {
      await sheetsCall(`/spreadsheets/${spreadsheetId}:batchUpdate`, "POST", {
        requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
      });
    }

    const syncedAt = new Date().toISOString();
    payloads.push({
      title: summaryTitle,
      values: [
        ["Table", "Rows"],
        ...Object.entries(counts).map(([t, n]) => [t, n]),
        [],
        ["Last synced (UTC)", syncedAt],
        ["Synced by", u.user.email ?? u.user.id],
      ],
    });

    // Clear old contents, then write fresh values.
    await sheetsCall(`/spreadsheets/${spreadsheetId}/values:batchClear`, "POST", {
      ranges: payloads.map((p) => `${p.title}!A1:ZZ50000`),
    });

    await sheetsCall(
      `/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      "POST",
      {
        valueInputOption: "RAW",
        data: payloads.map((p) => ({
          range: `${p.title}!A1`,
          majorDimension: "ROWS",
          values: p.values,
        })),
      },
    );

    await admin.from("app_settings").upsert(
      {
        key: SETTING_KEY,
        value: {
          spreadsheet_id: spreadsheetId,
          url: spreadsheetUrl,
          last_synced_at: syncedAt,
          last_synced_by: u.user.email ?? u.user.id,
          counts,
        },
        updated_at: syncedAt,
      },
      { onConflict: "key" },
    );

    return json({
      ok: true,
      spreadsheet_id: spreadsheetId,
      url: spreadsheetUrl,
      synced_at: syncedAt,
      tables: payloads.length,
      counts,
    });
  } catch (e) {
    console.error("sync-google-sheets failed:", e);
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
