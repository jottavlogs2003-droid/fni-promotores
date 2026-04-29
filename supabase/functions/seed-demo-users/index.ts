// Edge function to seed 3 demo users (admin, contratante, promotor)
// Idempotent: skips users that already exist.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_USERS = [
  { email: "admin@fni.com",        password: "Fni@2026", nome: "Admin FNI",          role: "admin" as const },
  { email: "contratante@fni.com",  password: "Fni@2026", nome: "Contratante Demo",   role: "contratante" as const },
  { email: "promotor@fni.com",     password: "Fni@2026", nome: "Promotor Demo",      role: "promotor" as const },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Ensure a demo cliente exists (for the contratante to be linked to)
    let clienteId: string | null = null;
    const { data: existingCliente } = await supabase
      .from("clientes").select("id").eq("nome", "Cliente Demo FNI").maybeSingle();
    if (existingCliente) {
      clienteId = existingCliente.id;
    } else {
      const { data: newCliente, error: cliErr } = await supabase
        .from("clientes")
        .insert({ nome: "Cliente Demo FNI", email_contato: "contato@clientedemo.com", ativo: true })
        .select("id").single();
      if (cliErr) throw cliErr;
      clienteId = newCliente.id;
    }

    const results: any[] = [];

    for (const u of DEMO_USERS) {
      // Check if user already exists
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list.users.find((x: any) => x.email === u.email);

      let userId: string;
      let created = false;

      if (existing) {
        userId = existing.id;
      } else {
        const { data: created_, error: cErr } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { nome: u.nome },
        });
        if (cErr) throw cErr;
        userId = created_.user!.id;
        created = true;
      }

      // Upsert profile
      await supabase.from("profiles").upsert({
        id: userId,
        nome: u.nome,
        email: u.email,
        cliente_id: u.role === "contratante" ? clienteId : null,
        ativo: true,
      });

      // Ensure role
      await supabase.from("user_roles").upsert(
        { user_id: userId, role: u.role },
        { onConflict: "user_id,role" }
      );

      // Remove the default 'promotor' role auto-added on signup for admin/contratante
      if (u.role !== "promotor") {
        await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "promotor");
      }

      results.push({ email: u.email, role: u.role, userId, created });
    }

    return new Response(
      JSON.stringify({ ok: true, clienteId, users: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("seed-demo-users error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
