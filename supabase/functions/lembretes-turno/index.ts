// Edge function: cria notificações para promotores com turnos nas próximas 2h
// e alerta admins sobre turnos sem check-in (mais de 30min após início).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const agora = new Date();
  const hoje = agora.toISOString().slice(0, 10);
  const nowMin = agora.getHours() * 60 + agora.getMinutes();

  let lembretes = 0;
  let alertas = 0;

  // 1) Buscar escalas de hoje
  const { data: escalas, error } = await supabase
    .from("escalas")
    .select("id,promotor_id,loja_id,data,hora_inicio,status,check_in_id,lojas(nome)")
    .eq("data", hoje)
    .eq("status", "agendado");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Admins (para alertas)
  const { data: adminRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  const adminIds = (adminRoles ?? []).map((r: any) => r.user_id);

  for (const esc of escalas ?? []) {
    const [hh, mm] = String(esc.hora_inicio).split(":").map(Number);
    const startMin = hh * 60 + (mm || 0);
    const diff = startMin - nowMin;
    const lojaNome = (esc as any).lojas?.nome ?? "loja";

    // Lembrete: turno começa em 0 a 120 minutos
    if (diff > 0 && diff <= 120) {
      // Evita duplicar: checa se já existe notificação tipo 'lembrete' para esta escala hoje
      const { data: jaExiste } = await supabase
        .from("notificacoes")
        .select("id")
        .eq("user_id", esc.promotor_id)
        .eq("tipo", `lembrete:${esc.id}`)
        .limit(1);
      if (!jaExiste || jaExiste.length === 0) {
        await supabase.from("notificacoes").insert({
          user_id: esc.promotor_id,
          titulo: "Turno chegando",
          mensagem: `Você tem turno em ${lojaNome} às ${esc.hora_inicio}.`,
          tipo: `lembrete:${esc.id}`,
        });
        lembretes++;
      }
    }

    // Alerta: passou 30 min do início e ainda sem check-in
    if (diff <= -30 && !esc.check_in_id && adminIds.length > 0) {
      const { data: jaAlertou } = await supabase
        .from("notificacoes")
        .select("id")
        .eq("tipo", `noshow:${esc.id}`)
        .limit(1);
      if (!jaAlertou || jaAlertou.length === 0) {
        const rows = adminIds.map((uid: string) => ({
          user_id: uid,
          titulo: "Promotor sem check-in",
          mensagem: `Turno em ${lojaNome} (${esc.hora_inicio}) sem check-in há mais de 30min.`,
          tipo: `noshow:${esc.id}`,
        }));
        await supabase.from("notificacoes").insert(rows);
        alertas += rows.length;
      }
    }
  }

  return new Response(
    JSON.stringify({ ok: true, lembretes, alertas, escalas: escalas?.length ?? 0 }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
});
