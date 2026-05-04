// Admin-only: creates a login (auth user) for a contratante and links to a cliente.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: me } = await userClient.auth.getUser();
    if (!me.user) return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: corsHeaders });

    const admin = createClient(url, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", me.user.id);
    if (!roles?.some(r => r.role === "admin")) {
      return new Response(JSON.stringify({ error: "Apenas admin" }), { status: 403, headers: corsHeaders });
    }

    const { email, password, nome, cliente_id } = await req.json();
    if (!email || !password || !cliente_id) {
      return new Response(JSON.stringify({ error: "email, password e cliente_id são obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    // Try create or find existing
    let userId: string;
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list.users.find((x: any) => x.email === email);
    if (existing) {
      userId = existing.id;
      await admin.auth.admin.updateUserById(userId, { password });
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { nome },
      });
      if (cErr) throw cErr;
      userId = created.user!.id;
    }

    await admin.from("profiles").upsert({ id: userId, nome: nome ?? email, email, cliente_id, ativo: true });
    await admin.from("user_roles").delete().eq("user_id", userId);
    await admin.from("user_roles").insert({ user_id: userId, role: "contratante" });

    return new Response(JSON.stringify({ ok: true, userId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
