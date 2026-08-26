import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Parse an ICS date value: 20260826T090000Z | 20260826T090000 | 20260826
function parseIcsDate(value: string, tzid?: string): { iso: string; allDay: boolean } | null {
  const v = value.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mi, ss, z] = m;
  if (!hh) return { iso: `${y}-${mo}-${d}T00:00:00`, allDay: true };
  if (z) return { iso: new Date(Date.UTC(+y, +mo - 1, +d, +hh, +mi, +ss)).toISOString(), allDay: false };
  // Floating / TZID times: treat as UTC offset-less; client renders as local wall time.
  void tzid;
  return { iso: `${y}-${mo}-${d}T${hh}:${mi}:${ss}`, allDay: false };
}

function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length) out[out.length - 1] += line.slice(1);
    else out.push(line);
  }
  return out;
}

function parseIcs(text: string) {
  const events: any[] = [];
  let cur: any = null;
  for (const line of unfold(text)) {
    if (line.startsWith("BEGIN:VEVENT")) { cur = {}; continue; }
    if (line.startsWith("END:VEVENT")) {
      if (cur?.start && cur?.end) events.push(cur);
      else if (cur?.start) { cur.end = cur.start; events.push(cur); }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const rawKey = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = rawKey.split(";")[0].toUpperCase();
    const tzid = /TZID=([^;:]+)/.exec(rawKey)?.[1];
    if (key === "UID") cur.id = value;
    else if (key === "SUMMARY") cur.title = value.replace(/\\,/g, ",").replace(/\\n/g, " ");
    else if (key === "LOCATION") cur.location = value.replace(/\\,/g, ",");
    else if (key === "DESCRIPTION") cur.description = value.replace(/\\n/g, "\n").slice(0, 500);
    else if (key === "DTSTART") { const p = parseIcsDate(value, tzid); if (p) { cur.start = p.iso; cur.allDay = p.allDay; } }
    else if (key === "DTEND") { const p = parseIcsDate(value, tzid); if (p) cur.end = p.iso; }
  }
  return events.map((e, i) => ({
    id: e.id ?? `ics-${i}`,
    title: e.title ?? "(no title)",
    start: e.start,
    end: e.end,
    allDay: !!e.allDay,
    location: e.location ?? null,
    description: e.description ?? null,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: staff } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", u.user.id)
      .in("role", ["admin", "teacher"])
      .maybeSingle();
    if (!staff) return json({ error: "Staff only" }, 403);

    const body = await req.json().catch(() => ({}));
    let feed = typeof body.url === "string" ? body.url.trim() : "";
    if (feed.startsWith("webcal://")) feed = "https://" + feed.slice("webcal://".length);
    if (!/^https:\/\/[^\s]+$/i.test(feed)) return json({ error: "Provide a valid https (or webcal) calendar link" }, 400);

    const res = await fetch(feed, { headers: { Accept: "text/calendar, text/plain, */*" } });
    const text = await res.text();
    if (!res.ok) {
      console.error(`ICS fetch failed [${res.status}]: ${text.slice(0, 300)}`);
      return json({ error: `Calendar feed error [${res.status}]`, details: text.slice(0, 300) }, res.status);
    }
    if (!text.includes("BEGIN:VCALENDAR")) {
      return json({ error: "That link did not return a calendar (.ics) feed." }, 400);
    }

    return json({ events: parseIcs(text) });
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
