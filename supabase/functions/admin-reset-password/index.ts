import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function tempPassword(): string {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const base = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "x").replace(/\//g, "y").replace(/=+$/, "");
  // Guarantee complexity for password policies.
  return `Arp${base}!9`;
}

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
    if (!u.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(url, serviceKey);
    const { data: isAdmin } = await admin.from("user_roles").select("id")
      .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { student_id, password: requestedPassword, send_email } = await req.json();
    if (!student_id) {
      return new Response(JSON.stringify({ error: "student_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Admin explicitly asked to email a reset link instead.
    if (send_email) {
      const { data: profile } = await admin
        .from("profiles")
        .select("email")
        .eq("id", student_id)
        .maybeSingle();
      if (!profile?.email) {
        return new Response(JSON.stringify({ error: "Student has no email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { error: linkErr } = await admin.auth.resetPasswordForEmail(profile.email);
      if (linkErr) {
        return new Response(JSON.stringify({ error: "Could not send reset email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ mode: "email_sent", email: profile.email }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Direct password set — no email involved. Use the admin-chosen password
    // when provided, otherwise generate a temporary one and return it once.
    const password = (typeof requestedPassword === "string" && requestedPassword.length >= 6)
      ? requestedPassword
      : tempPassword();

    const { error } = await admin.auth.admin.updateUserById(student_id, { password });
    if (error) {
      return new Response(JSON.stringify({ error: "Could not reset password" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ mode: "temp_password", password }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
