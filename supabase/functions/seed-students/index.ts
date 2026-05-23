import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SEED = [
  "Kin",
  "Buri",
  "MeiZhen",
  "Methawee Kirin",
  "Teerapol Siriphanupong",
  "Peach",
  "Pear",
  "Bundan Chaitan",
  "Kitty (Idea)",
  "Jejee",
  "Baiboon",
  "Pinky (Home)",
];

const slug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "student";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const admin = createClient(url, serviceKey);
  const { data: isAdmin } = await admin.from("user_roles").select("id").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const created: { name: string; email: string; password: string; status: string }[] = [];

  for (const name of SEED) {
    const email = `${slug(name)}@arpspeak.app`;
    const password = "ARPspeak2026!";

    // Skip if exists
    const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existing) {
      created.push({ name, email, password, status: "exists" });
      continue;
    }

    const { data: u, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error || !u.user) {
      created.push({ name, email, password, status: `error: ${error?.message}` });
      continue;
    }
    await admin.from("profiles").update({ full_name: name }).eq("id", u.user.id);
    created.push({ name, email, password, status: "created" });
  }

  return new Response(JSON.stringify({ students: created }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
