import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bootstrap-code",
};

const ADMIN_ID = "769f3072-9e10-4b46-9878-33840ad04db6";
const ADMIN_EMAIL = "alyssareedo@gmail.com";
const ADMIN_NAME = "Alyssa";
const BOOTSTRAP_CODE = "arp-admin-bootstrap-2026-05-24-7d6a9f2c";

const students = [
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

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "student";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.headers.get("x-bootstrap-code") !== BOOTSTRAP_CODE) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { adminPassword = "ARPAdmin2026!", studentPassword = "ARPStudent2026!" } = await req.json().catch(() => ({}));
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);

  const { error: updateError } = await admin.auth.admin.updateUserById(ADMIN_ID, {
    email: ADMIN_EMAIL,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: ADMIN_NAME },
  });
  if (updateError) return new Response(JSON.stringify({ error: updateError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  await admin.from("profiles").upsert({ id: ADMIN_ID, email: ADMIN_EMAIL, full_name: ADMIN_NAME, level: "C2", goals: "Teacher admin account", notes: "Admin profile" });
  await admin.from("user_roles").upsert({ user_id: ADMIN_ID, role: "admin" }, { onConflict: "user_id,role" });

  const seeded: { name: string; email: string; status: string }[] = [];
  for (const name of students) {
    const email = `${slug(name)}@arpspeak.app`;
    const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existingProfile?.id) {
      seeded.push({ name, email, status: "exists" });
      continue;
    }

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: studentPassword,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    if (error || !created.user) {
      seeded.push({ name, email, status: `error: ${error?.message ?? "unknown"}` });
      continue;
    }
    await admin.from("profiles").upsert({ id: created.user.id, email, full_name: name, level: "A1", goals: "Build confident English speaking skills", notes: "" });
    await admin.from("user_roles").upsert({ user_id: created.user.id, role: "student" }, { onConflict: "user_id,role" });
    seeded.push({ name, email, status: "created" });
  }

  return new Response(JSON.stringify({ ok: true, adminEmail: ADMIN_EMAIL, seeded }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});