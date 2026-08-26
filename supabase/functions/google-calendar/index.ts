import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const connKey = Deno.env.get("GOOGLE_CALENDAR_API_KEY");

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, serviceKey);
    const { data: staff } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", u.user.id)
      .in("role", ["admin", "teacher"])
      .maybeSingle();
    if (!staff) return json({ error: "Staff only" }, 403);

    if (!lovableKey || !connKey) {
      return json({ error: "Google Calendar is not connected yet." }, 400);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = typeof body.action === "string" ? body.action : "events";

    const call = async (path: string, params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`${GATEWAY}${path}${qs ? `?${qs}` : ""}`, {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": connKey,
        },
      });
      const text = await res.text();
      if (!res.ok) {
        console.error(`Google Calendar request failed [${res.status}]: ${text}`);
        throw new Error(`[${res.status}] ${text}`);
      }
      return JSON.parse(text || "{}");
    };

    if (action === "calendars") {
      const data = await call("/users/me/calendarList", { maxResults: "50" });
      return json({
        calendars: (data.items ?? []).map((c: any) => ({
          id: c.id,
          summary: c.summary,
          primary: !!c.primary,
        })),
      });
    }

    if (action === "events") {
      const calendarId = typeof body.calendarId === "string" && body.calendarId ? body.calendarId : "primary";
      const timeMin = typeof body.timeMin === "string" ? body.timeMin : new Date().toISOString();
      const timeMax = typeof body.timeMax === "string"
        ? body.timeMax
        : new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();

      const data = await call(`/calendars/${encodeURIComponent(calendarId)}/events`, {
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
      });

      return json({
        events: (data.items ?? [])
          .filter((e: any) => e.status !== "cancelled")
          .map((e: any) => ({
            id: e.id,
            title: e.summary ?? "(no title)",
            start: e.start?.dateTime ?? e.start?.date,
            end: e.end?.dateTime ?? e.end?.date,
            allDay: !e.start?.dateTime,
            location: e.location ?? null,
            htmlLink: e.htmlLink ?? null,
          })),
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
