import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(url, serviceKey);
    const { data: isAdmin } = await admin.from("user_roles").select("id")
      .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!isAdmin) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { student_id, email, full_name, phone } = await req.json();
    if (!student_id) {
      return new Response(JSON.stringify({ error: "student_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update auth email if provided & changed
    if (email) {
      const { error: aErr } = await admin.auth.admin.updateUserById(student_id, {
        email,
        email_confirm: true,
      });
      if (aErr) return new Response(JSON.stringify({ error: aErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update profile (history-preserving — only specified fields)
    const patch: Record<string, unknown> = {};
    if (email !== undefined) {
      patch.email = email;
      patch.placeholder_email = email?.endsWith?.("@arpspeak.local") ? true : false;
    }
    if (full_name !== undefined) patch.full_name = full_name;
    if (phone !== undefined) patch.phone = phone;

    if (Object.keys(patch).length > 0) {
      const { error: pErr } = await admin.from("profiles").update(patch).eq("id", student_id);
      if (pErr) return new Response(JSON.stringify({ error: pErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
