import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatCard } from "@/components/StatCard";
import { DollarSign, TrendingUp, TrendingDown, Wallet, FileText, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function firstOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function lastOfMonth() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10); }

/* ---------------- DASHBOARD FINANCEIRO ---------------- */
export function FinanceiroDashboard() {
  const [resumo, setResumo] = useState<any[]>([]);
  const [pendPag, setPendPag] = useState(0);
  const [pendFat, setPendFat] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: r }, { data: p }, { data: f }] = await Promise.all([
        supabase.from("resumo_financeiro_mensal").select("*").limit(6),
        supabase.from("pagamentos_promotores").select("valor_total").eq("status", "pendente"),
        supabase.from("faturas_clientes").select("valor_total").in("status", ["aberta", "enviada", "vencida"]),
      ]);
      setResumo(r ?? []);
      setPendPag((p ?? []).reduce((s: number, x: any) => s + Number(x.valor_total || 0), 0));
      setPendFat((f ?? []).reduce((s: number, x: any) => s + Number(x.valor_total || 0), 0));
    })();
  }, []);

  const mesAtual = resumo[0] ?? { total_pagar_promotores: 0, total_receber_clientes: 0, lucro: 0 };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display font-bold">Financeiro</h1>
        <p className="text-foreground/70">Pagamentos, cobranças e lucro consolidado.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="A pagar (mês)" value={BRL(Number(mesAtual.total_pagar_promotores))} icon={TrendingDown} variant="warning" />
        <StatCard label="A receber (mês)" value={BRL(Number(mesAtual.total_receber_clientes))} icon={TrendingUp} variant="success" />
        <StatCard label="Lucro estimado" value={BRL(Number(mesAtual.lucro))} icon={DollarSign} variant="primary" />
        <StatCard label="Faturas em aberto" value={BRL(pendFat)} icon={FileText} variant="secondary" />
      </div>

      <Card className="p-5">
        <h2 className="font-display font-bold text-lg mb-3">Resumo dos últimos meses</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left p-3">Mês</th>
              <th className="text-right p-3">A pagar</th>
              <th className="text-right p-3">A receber</th>
              <th className="text-right p-3">Lucro</th>
            </tr></thead>
            <tbody>
              {resumo.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-foreground/60">Sem dados ainda. Cadastre escalas para começar.</td></tr>}
              {resumo.map((r: any) => (
                <tr key={r.mes} className="border-b border-border last:border-0">
                  <td className="p-3 font-medium">{r.mes}</td>
                  <td className="p-3 text-right text-warning-foreground/90">{BRL(Number(r.total_pagar_promotores))}</td>
                  <td className="p-3 text-right text-success">{BRL(Number(r.total_receber_clientes))}</td>
                  <td className="p-3 text-right font-bold">{BRL(Number(r.lucro))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 bg-warning/10 border-warning/40">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-warning-foreground" />
          <div className="flex-1">
            <p className="font-semibold">{BRL(pendPag)} em pagamentos pendentes a promotores</p>
            <p className="text-sm text-foreground/70">Vá para Pagamentos para gerar e quitar.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- PAGAMENTOS A PROMOTORES ---------------- */
export function PagamentosPromotores() {
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [promotores, setPromotores] = useState<any[]>([]);
  const [inicio, setInicio] = useState(firstOfMonth());
  const [fim, setFim] = useState(lastOfMonth());

  async function load() {
    const { data } = await supabase.from("pagamentos_promotores")
      .select("*, profiles!pagamentos_promotores_promotor_id_fkey(nome, email, chave_pix, forma_pagamento)")
      .order("created_at", { ascending: false });
    setPagamentos(data ?? []);
  }
  useEffect(() => {
    load();
    supabase.from("profiles").select("id, nome, email, valor_diaria, valor_hora_extra, forma_pagamento").then(({ data }) => setPromotores(data ?? []));
  }, []);

  async function gerarLote() {
    setBusy(true);
    try {
      // Para cada promotor com escalas concluídas no período, gera 1 pagamento
      const { data: escalas } = await supabase.from("escalas")
        .select("promotor_id, diarias, duracao_horas")
        .gte("data", inicio).lte("data", fim).eq("status", "concluido");
      const grupos = new Map<string, { diarias: number; turnos: number; horas: number }>();
      (escalas ?? []).forEach((e: any) => {
        const cur = grupos.get(e.promotor_id) ?? { diarias: 0, turnos: 0, horas: 0 };
        cur.diarias += Number(e.diarias);
        cur.turnos += 1;
        cur.horas += Number(e.duracao_horas);
        grupos.set(e.promotor_id, cur);
      });
      if (grupos.size === 0) { toast.info("Nenhuma escala concluída no período."); return; }
      const inserts: any[] = [];
      for (const [promotor_id, g] of grupos) {
        const p = promotores.find(x => x.id === promotor_id);
        const valor_diarias = g.diarias * Number(p?.valor_diaria ?? 0);
        const horas_padrao = g.turnos * 6;
        const horas_extras = Math.max(0, g.horas - horas_padrao);
        const valor_extras = horas_extras * Number(p?.valor_hora_extra ?? 0);
        inserts.push({
          promotor_id, periodo_inicio: inicio, periodo_fim: fim,
          total_diarias: g.diarias, total_turnos: g.turnos, horas_extras,
          valor_diarias, valor_extras, valor_total: valor_diarias + valor_extras,
          forma_pagamento: p?.forma_pagamento,
        });
      }
      const { error } = await supabase.from("pagamentos_promotores").insert(inserts);
      if (error) throw error;
      toast.success(`${inserts.length} pagamento(s) gerado(s).`);
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function marcarPago(id: string) {
    const { error } = await supabase.from("pagamentos_promotores").update({ status: "pago", data_pagamento: new Date().toISOString().slice(0, 10) }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Pago!"); load(); }
  }

  const total = pagamentos.reduce((s, p) => s + Number(p.valor_total || 0), 0);
  const pendente = pagamentos.filter(p => p.status === "pendente").reduce((s, p) => s + Number(p.valor_total || 0), 0);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Pagamentos a promotores</h1>
          <p className="text-foreground/70 text-sm">{pagamentos.length} pagamento(s) · pendente {BRL(pendente)}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="brand"><Plus className="h-4 w-4" /> Gerar lote</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Gerar pagamentos do período</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Início</Label><Input type="date" value={inicio} onChange={e => setInicio(e.target.value)} /></div>
                <div><Label>Fim</Label><Input type="date" value={fim} onChange={e => setFim(e.target.value)} /></div>
              </div>
              <p className="text-xs text-foreground/70">Sistema lê todas as escalas concluídas no período e calcula diárias + horas extras por promotor.</p>
              <Button onClick={gerarLote} disabled={busy} variant="brand" className="w-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Gerar pagamentos
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-4 bg-card/60">
        <div><p className="text-xs text-foreground/70">Total geral</p><p className="text-xl font-bold">{BRL(total)}</p></div>
        <div><p className="text-xs text-foreground/70">Pendente</p><p className="text-xl font-bold text-warning">{BRL(pendente)}</p></div>
        <div><p className="text-xs text-foreground/70">Pago</p><p className="text-xl font-bold text-success">{BRL(total - pendente)}</p></div>
        <div><p className="text-xs text-foreground/70">Promotores</p><p className="text-xl font-bold">{new Set(pagamentos.map(p => p.promotor_id)).size}</p></div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left p-3">Promotor</th>
              <th className="text-left p-3">Período</th>
              <th className="text-right p-3">Diárias</th>
              <th className="text-right p-3">H.extras</th>
              <th className="text-right p-3">Valor</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3"></th>
            </tr></thead>
            <tbody>
              {pagamentos.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-foreground/60">Nenhum pagamento gerado.</td></tr>}
              {pagamentos.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-card/40">
                  <td className="p-3 font-medium">{p.profiles?.nome}<div className="text-xs text-foreground/60">{p.forma_pagamento ?? "—"}</div></td>
                  <td className="p-3 text-xs">{p.periodo_inicio} → {p.periodo_fim}</td>
                  <td className="p-3 text-right">{Number(p.total_diarias).toFixed(1)}</td>
                  <td className="p-3 text-right">{Number(p.horas_extras).toFixed(1)}h</td>
                  <td className="p-3 text-right font-semibold">{BRL(Number(p.valor_total))}</td>
                  <td className="p-3"><Badge className={p.status === "pago" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>{p.status}</Badge></td>
                  <td className="p-3">
                    {p.status === "pendente" && <Button size="sm" variant="outline" onClick={() => marcarPago(p.id)}><CheckCircle2 className="h-4 w-4" /> Pagar</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- FATURAS DE CLIENTES ---------------- */
export function FaturasClientes() {
  const [faturas, setFaturas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inicio, setInicio] = useState(firstOfMonth());
  const [fim, setFim] = useState(lastOfMonth());

  async function load() {
    const { data } = await supabase.from("faturas_clientes")
      .select("*, clientes(nome, valor_diaria_cobrada, tipo_cobranca)")
      .order("created_at", { ascending: false });
    setFaturas(data ?? []);
  }
  useEffect(() => {
    load();
    supabase.from("clientes").select("id, nome, valor_diaria_cobrada, valor_hora_cobrada, valor_mensal, tipo_cobranca").then(({ data }) => setClientes(data ?? []));
  }, []);

  async function gerarFaturas() {
    setBusy(true);
    try {
      // Soma diárias por cliente via lojas
      const { data: lojas } = await supabase.from("lojas").select("id, cliente_id");
      const lojaMap = new Map<string, string>();
      (lojas ?? []).forEach((l: any) => lojaMap.set(l.id, l.cliente_id));
      const { data: escalas } = await supabase.from("escalas")
        .select("loja_id, diarias, duracao_horas")
        .gte("data", inicio).lte("data", fim).eq("status", "concluido");
      const grupos = new Map<string, { diarias: number; horas: number }>();
      (escalas ?? []).forEach((e: any) => {
        const cliente_id = lojaMap.get(e.loja_id); if (!cliente_id) return;
        const cur = grupos.get(cliente_id) ?? { diarias: 0, horas: 0 };
        cur.diarias += Number(e.diarias); cur.horas += Number(e.duracao_horas);
        grupos.set(cliente_id, cur);
      });
      if (grupos.size === 0) { toast.info("Sem execuções no período."); return; }
      const inserts: any[] = [];
      for (const [cliente_id, g] of grupos) {
        const c = clientes.find(x => x.id === cliente_id);
        let valor_total = 0;
        if (c?.tipo_cobranca === "hora") valor_total = g.horas * Number(c.valor_hora_cobrada ?? 0);
        else if (c?.tipo_cobranca === "mensal") valor_total = Number(c.valor_mensal ?? 0);
        else valor_total = g.diarias * Number(c?.valor_diaria_cobrada ?? 0);
        const venc = new Date(fim); venc.setDate(venc.getDate() + 10);
        inserts.push({
          cliente_id, periodo_inicio: inicio, periodo_fim: fim,
          total_diarias: g.diarias, total_horas: g.horas, valor_total,
          numero_fatura: `FNI-${Date.now().toString().slice(-6)}-${cliente_id.slice(0, 4)}`,
          data_vencimento: venc.toISOString().slice(0, 10),
        });
      }
      const { error } = await supabase.from("faturas_clientes").insert(inserts);
      if (error) throw error;
      toast.success(`${inserts.length} fatura(s) gerada(s).`);
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function marcarPaga(id: string) {
    const { error } = await supabase.from("faturas_clientes").update({ status: "paga", data_pagamento: new Date().toISOString().slice(0, 10) }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Fatura paga!"); load(); }
  }

  const totais = useMemo(() => {
    const tot = faturas.reduce((s, f) => s + Number(f.valor_total || 0), 0);
    const pago = faturas.filter(f => f.status === "paga").reduce((s, f) => s + Number(f.valor_total || 0), 0);
    return { tot, pago, aberto: tot - pago };
  }, [faturas]);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Faturas de clientes</h1>
          <p className="text-foreground/70 text-sm">{faturas.length} fatura(s) · em aberto {BRL(totais.aberto)}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="brand"><Plus className="h-4 w-4" /> Gerar faturas</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Gerar faturas do período</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Início</Label><Input type="date" value={inicio} onChange={e => setInicio(e.target.value)} /></div>
                <div><Label>Fim</Label><Input type="date" value={fim} onChange={e => setFim(e.target.value)} /></div>
              </div>
              <p className="text-xs text-foreground/70">Calcula automaticamente por diária, hora ou mensal de acordo com o contrato de cada cliente.</p>
              <Button onClick={gerarFaturas} disabled={busy} variant="brand" className="w-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Gerar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4 grid grid-cols-3 gap-4">
        <div><p className="text-xs text-foreground/70">Total faturado</p><p className="text-xl font-bold">{BRL(totais.tot)}</p></div>
        <div><p className="text-xs text-foreground/70">Recebido</p><p className="text-xl font-bold text-success">{BRL(totais.pago)}</p></div>
        <div><p className="text-xs text-foreground/70">A receber</p><p className="text-xl font-bold text-warning">{BRL(totais.aberto)}</p></div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left p-3">Nº</th>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Período</th>
              <th className="text-right p-3">Diárias</th>
              <th className="text-right p-3">Valor</th>
              <th className="text-left p-3">Vencto</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3"></th>
            </tr></thead>
            <tbody>
              {faturas.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-foreground/60">Nenhuma fatura gerada.</td></tr>}
              {faturas.map(f => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-card/40">
                  <td className="p-3 font-mono text-xs">{f.numero_fatura}</td>
                  <td className="p-3 font-medium">{f.clientes?.nome}</td>
                  <td className="p-3 text-xs">{f.periodo_inicio} → {f.periodo_fim}</td>
                  <td className="p-3 text-right">{Number(f.total_diarias).toFixed(1)}</td>
                  <td className="p-3 text-right font-semibold">{BRL(Number(f.valor_total))}</td>
                  <td className="p-3 text-xs">{f.data_vencimento ?? "—"}</td>
                  <td className="p-3"><Badge className={f.status === "paga" ? "bg-success text-success-foreground" : f.status === "vencida" ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}>{f.status}</Badge></td>
                  <td className="p-3">
                    {f.status !== "paga" && <Button size="sm" variant="outline" onClick={() => marcarPaga(f.id)}><CheckCircle2 className="h-4 w-4" /> Receber</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- ESCALA INTELIGENTE ---------------- */
const PERIODOS = {
  manha: { label: "Manhã", inicio: "08:00", fim: "14:00" },
  tarde: { label: "Tarde", inicio: "14:00", fim: "20:00" },
  dia: { label: "Dia inteiro (manhã + tarde)", inicio: "08:00", fim: "20:00" },
} as const;
type PeriodoKey = keyof typeof PERIODOS;

export function EscalaAdmin() {
  const [escalas, setEscalas] = useState<any[]>([]);
  const [promotores, setPromotores] = useState<any[]>([]);
  const [lojas, setLojas] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [openProm, setOpenProm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoKey>("manha");
  const [horaIni, setHoraIni] = useState("08:00");
  const [horaFim, setHoraFim] = useState("14:00");
  const [custom, setCustom] = useState(false);

  async function load() {
    const { data } = await supabase.from("escalas")
      .select("*, profiles!escalas_promotor_id_fkey(nome, tipo_promotor), lojas(nome, cidade)")
      .order("data", { ascending: false }).limit(200);
    setEscalas(data ?? []);
  }
  async function loadPromotores() {
    const { data } = await supabase.from("profiles").select("id, nome, tipo_promotor, jornada_horas, valor_diaria, permite_dupla_diaria");
    setPromotores(data ?? []);
  }
  useEffect(() => {
    load(); loadPromotores();
    supabase.from("lojas").select("id, nome, cidade, cliente_id").eq("ativo", true).then(({ data }) => setLojas(data ?? []));
  }, []);

  function aplicarPeriodo(p: PeriodoKey) {
    setPeriodo(p);
    setHoraIni(PERIODOS[p].inicio);
    setHoraFim(PERIODOS[p].fim);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      const promotor_id = fd.get("promotor_id") as string;
      const loja_id = fd.get("loja_id") as string;
      const data = fd.get("data") as string;

      // Se "Manhã + Tarde": cria 2 escalas com horários editados (manhã e tarde).
      // Caso contrário: 1 escala com horaIni/horaFim editados livremente.
      const turnos = periodo === "dia"
        ? [
            { hora_inicio: horaIni, hora_fim: PERIODOS.manha.fim, turno: 1 },
            { hora_inicio: PERIODOS.tarde.inicio, hora_fim: horaFim, turno: 2 },
          ]
        : [{ hora_inicio: horaIni, hora_fim: horaFim, turno: periodo === "tarde" ? 2 : 1 }];

      const inserts = turnos.map(t => {
        const [hI, mI] = t.hora_inicio.split(":").map(Number);
        const [hF, mF] = t.hora_fim.split(":").map(Number);
        const dur = ((hF * 60 + mF) - (hI * 60 + mI)) / 60;
        if (dur <= 0) throw new Error("Horário final deve ser após o inicial.");
        return {
          promotor_id, loja_id, data,
          hora_inicio: t.hora_inicio, hora_fim: t.hora_fim,
          duracao_horas: dur, diarias: dur >= 12 ? 2 : 1, turno: t.turno,
        };
      });

      const { error } = await supabase.from("escalas").insert(inserts);
      if (error) throw error;
      toast.success(`${inserts.length} turno(s) criado(s)!`);
      setOpen(false); load();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  }

  async function criarPromotor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      const email = fd.get("email") as string;
      const nome = fd.get("nome") as string;
      const senha = (fd.get("senha") as string) || "Fni@2026";
      const valor_diaria = Number(fd.get("valor_diaria") || 0);

      // signUp cria o usuário; trigger handle_new_user já cria profile + role promotor
      const redirectUrl = `${window.location.origin}/app`;
      const { data, error } = await supabase.auth.signUp({
        email, password: senha,
        options: { emailRedirectTo: redirectUrl, data: { nome } },
      });
      if (error) throw error;
      if (data.user) {
        const tel = (fd.get("telefone") as string) || null;
        await supabase.from("profiles").update({ nome, valor_diaria, telefone: tel }).eq("id", data.user.id);
      }
      toast.success(`Promotor "${nome}" cadastrado!`);
      setOpenProm(false); loadPromotores();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  }

  async function setStatus(id: string, status: string) {
    await supabase.from("escalas").update({ status }).eq("id", id);
    load();
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Escala</h1>
          <p className="text-foreground/70 text-sm">{escalas.length} turnos cadastrados</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={openProm} onOpenChange={setOpenProm}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4" /> Adicionar promotor</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar novo promotor</DialogTitle></DialogHeader>
              <form onSubmit={criarPromotor} className="space-y-3">
                <div><Label>Nome completo</Label><Input name="nome" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input name="email" type="email" required /></div>
                  <div><Label>Telefone</Label><Input name="telefone" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Senha inicial</Label><Input name="senha" defaultValue="Fni@2026" /></div>
                  <div><Label>Valor da diária (R$)</Label><Input name="valor_diaria" type="number" step="0.01" defaultValue="100" /></div>
                </div>
                <p className="text-xs text-foreground/70">Conta criada como promotor. Demais dados (PIX, jornada) podem ser ajustados em "Promotores".</p>
                <Button type="submit" disabled={busy} variant="brand" className="w-full">
                  {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Cadastrar
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button variant="brand"><Plus className="h-4 w-4" /> Novo turno</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Agendar turno</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div><Label>Promotor</Label>
                  <select name="promotor_id" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Selecione</option>
                    {promotores.map(p => <option key={p.id} value={p.id}>{p.nome} ({p.tipo_promotor ?? "—"} · {p.jornada_horas ?? 6}h)</option>)}
                  </select>
                </div>
                <div><Label>Loja</Label>
                  <select name="loja_id" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Selecione</option>
                    {lojas.map(l => <option key={l.id} value={l.id}>{l.nome} — {l.cidade}</option>)}
                  </select>
                </div>
                <div><Label>Data</Label><Input type="date" name="data" required defaultValue={new Date().toISOString().slice(0, 10)} /></div>

                <div>
                  <Label>Período</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    {(Object.keys(PERIODOS) as PeriodoKey[]).map(k => (
                      <button type="button" key={k} onClick={() => aplicarPeriodo(k)}
                        className={`p-2 rounded-md border text-xs font-medium transition-base ${periodo === k ? "border-primary bg-primary/15 text-primary" : "border-input hover:bg-muted/40"}`}>
                        {k === "manha" ? "🌅 Manhã" : k === "tarde" ? "🌇 Tarde" : "☀️ Manhã + Tarde"}
                        <div className="text-[10px] opacity-70 mt-0.5">{PERIODOS[k].inicio}–{PERIODOS[k].fim}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div><Label>{periodo === "dia" ? "Início (manhã)" : "Início"}</Label><Input type="time" value={horaIni} onChange={e => setHoraIni(e.target.value)} required /></div>
                  <div><Label>{periodo === "dia" ? "Fim (tarde)" : "Fim"}</Label><Input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} required /></div>
                </div>

                <p className="text-xs text-foreground/70">
                  {periodo === "dia"
                    ? "→ 2 turnos: manhã (início → 14:00) e tarde (14:00 → fim) = 2 diárias."
                    : "→ ≥12h = 2 diárias, <12h = 1 diária. Edite o horário conforme cada promotor."}
                </p>
                <Button type="submit" disabled={busy} variant="brand" className="w-full">
                  {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left p-3">Data</th>
              <th className="text-left p-3">Promotor</th>
              <th className="text-left p-3">Loja</th>
              <th className="text-left p-3">Horário</th>
              <th className="text-left p-3">Turno</th>
              <th className="text-right p-3">Diárias</th>
              <th className="text-left p-3">Status</th>
              <th className="p-3"></th>
            </tr></thead>
            <tbody>
              {escalas.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-foreground/60">Nenhum turno agendado.</td></tr>}
              {escalas.map(e => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-card/40">
                  <td className="p-3 text-xs">{new Date(e.data).toLocaleDateString("pt-BR")}</td>
                  <td className="p-3 font-medium">{e.profiles?.nome}</td>
                  <td className="p-3">{e.lojas?.nome}</td>
                  <td className="p-3 text-xs">{e.hora_inicio?.slice(0,5)} → {e.hora_fim?.slice(0,5)} ({e.duracao_horas}h)</td>
                  <td className="p-3 text-xs">{e.turno === 2 ? "Tarde" : "Manhã"}</td>
                  <td className="p-3 text-right font-semibold">{Number(e.diarias).toFixed(1)}</td>
                  <td className="p-3"><Badge className={
                    e.status === "concluido" ? "bg-success text-success-foreground" :
                    e.status === "faltou" || e.status === "cancelado" ? "bg-destructive text-destructive-foreground" :
                    e.status === "em_andamento" ? "bg-warning text-warning-foreground" :
                    "bg-secondary text-secondary-foreground"
                  }>{e.status}</Badge></td>
                  <td className="p-3">
                    {e.status === "agendado" && <Button size="sm" variant="outline" onClick={() => setStatus(e.id, "concluido")}>Concluir</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
