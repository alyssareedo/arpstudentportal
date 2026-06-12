import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomPassword(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const base = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "x").replace(/\//g, "y").replace(/=+$/, "");
  return `Arp${base}!9`;
}

function placeholderEmail(full_name: string): string {
  const slug = (full_name || "student").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "student";
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${slug}${rand}@arpspeak.local`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(url, serviceKey);
    const { data: isAdmin } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { full_name, level, goals, phone, use_placeholder_email } = body ?? {};
    let { email } = body ?? {};

    if (!full_name) {
      return new Response(JSON.stringify({ error: "full_name required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let isPlaceholder = false;
    if (!email || use_placeholder_email) {
      email = placeholderEmail(full_name);
      isPlaceholder = true;
    }

    const password = randomPassword();

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "create failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("profiles").update({
      full_name,
      phone: phone ?? null,
      level: level ?? "A1",
      goals: goals ?? "",
      placeholder_email: isPlaceholder,
    }).eq("id", created.user.id);

    // For real emails, generate a recovery link admin can share. For placeholder
    // emails (no inbox), return the temp password so the admin can hand it over.
    let invite_link: string | null = null;
    let temp_password: string | null = null;
    if (isPlaceholder) {
      temp_password = password;
    } else {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "recovery",
        email,
      });
      invite_link = linkData?.properties?.action_link ?? null;
    }

    return new Response(JSON.stringify({
      id: created.user.id,
      email,
      placeholder_email: isPlaceholder,
      invite_link,
      temp_password,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
