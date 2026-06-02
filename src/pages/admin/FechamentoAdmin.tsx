import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Lock, Unlock, History, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

type Periodo = "semana" | "mes" | "ano";

function semanaISO(d: Date): { ano: number; semana: number; ini: Date; fim: Date } {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const semana = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const seg = new Date(d); seg.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
  return { ano: tmp.getUTCFullYear(), semana, ini: seg, fim: dom };
}

export function FechamentoMensal() {
  const { user } = useAuth();
  const [fechamentos, setFechamentos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [dataRef, setDataRef] = useState(() => new Date().toISOString().slice(0, 10));

  async function load() {
    const { data } = await (supabase as any).from("fechamentos_mensais")
      .select("*")
      .order("ano", { ascending: false })
      .order("mes", { ascending: false });
    setFechamentos(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function fechar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    let payload: any = { fechado_por: user.id };
    let extra = String(fd.get("observacoes") || "");
    let label = "";

    if (periodo === "ano") {
      // Fecha todos os 12 meses do ano (insere os que faltarem)
      const ja = new Set(fechamentos.filter(f => f.ano === ano && !f.reaberto_em).map(f => f.mes));
      const aFechar = Array.from({ length: 12 }, (_, i) => i + 1).filter(m => !ja.has(m));
      if (aFechar.length === 0) { toast.info("Ano já totalmente fechado."); setBusy(false); setOpen(false); return; }
      const rows = aFechar.map(m => ({ ano, mes: m, fechado_por: user.id, observacoes: `[ANUAL ${ano}] ${extra}`.trim() }));
      const { error } = await (supabase as any).from("fechamentos_mensais").insert(rows);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success(`Ano ${ano} fechado (${aFechar.length} meses).`);
      setOpen(false); load(); return;
    }

    if (periodo === "semana") {
      const ref = new Date(dataRef + "T00:00:00");
      const w = semanaISO(ref);
      label = `[SEMANA ${w.semana}/${w.ano} ${w.ini.toLocaleDateString("pt-BR")}–${w.fim.toLocaleDateString("pt-BR")}]`;
      payload.ano = w.ini.getFullYear();
      payload.mes = w.ini.getMonth() + 1;
    } else {
      label = `[MÊS]`;
      payload.ano = ano;
      payload.mes = mes;
    }
    payload.observacoes = `${label} ${extra}`.trim();

    const { error } = await (supabase as any).from("fechamentos_mensais").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Período fechado!");
    setOpen(false); load();
  }

  async function reabrirMes(id: string) {
    if (!user) return;
    if (!confirm("Tem certeza? Reabrir um período permite alterações em pagamentos, faturas e escalas.")) return;
    const { error } = await (supabase as any).from("fechamentos_mensais")
      .update({ reaberto_em: new Date().toISOString(), reaberto_por: user.id })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Período reaberto");
    load();
  }

  function rotuloFechamento(f: any) {
    const obs = String(f.observacoes ?? "");
    if (obs.startsWith("[SEMANA")) {
      const m = obs.match(/\[SEMANA ([^\]]+)\]/);
      return `🗓️ ${m?.[1] ?? `Semana ${MESES[f.mes-1]}/${f.ano}`}`;
    }
    if (obs.startsWith("[ANUAL")) return `📅 Anual ${f.ano} · ${MESES[f.mes-1]}`;
    return `${MESES[f.mes-1]} / ${f.ano}`;
  }

  const fechados = fechamentos.filter(f => !f.reaberto_em);
  const reabertos = fechamentos.filter(f => f.reaberto_em);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Lock className="h-7 w-7" /> Fechamento</h1>
          <p className="text-muted-foreground text-sm">Trava pagamentos, faturas e escalas · semanal, mensal ou anual.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="brand"><Lock className="h-4 w-4" /> Novo fechamento</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Fechar período</DialogTitle></DialogHeader>
            <form onSubmit={fechar} className="space-y-4">
              <div className="bg-warning/10 border border-warning/30 rounded-md p-3 text-sm flex gap-2">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <span>Após fechar, <strong>nenhum</strong> pagamento, fatura ou escala do período poderá ser editado, exceto se reaberto.</span>
              </div>

              <div>
                <Label className="mb-2 block">Tipo de período</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["semana", "mes", "ano"] as Periodo[]).map(p => (
                    <button key={p} type="button" onClick={() => setPeriodo(p)}
                      className={`p-3 rounded-md border text-sm font-medium transition-base ${periodo === p ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-muted/40"}`}>
                      {p === "semana" ? "Semanal" : p === "mes" ? "Mensal" : "Anual"}
                    </button>
                  ))}
                </div>
              </div>

              {periodo === "semana" && (
                <div>
                  <Label>Data dentro da semana</Label>
                  <Input type="date" value={dataRef} onChange={e => setDataRef(e.target.value)} required />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(() => { const w = semanaISO(new Date(dataRef + "T00:00:00")); return `Fecha semana ${w.semana}/${w.ano}: ${w.ini.toLocaleDateString("pt-BR")} – ${w.fim.toLocaleDateString("pt-BR")}`; })()}
                  </p>
                </div>
              )}

              {periodo === "mes" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Ano</Label>
                    <Input type="number" value={ano} onChange={e => setAno(Number(e.target.value))} min={2020} max={2100} />
                  </div>
                  <div>
                    <Label>Mês</Label>
                    <select value={mes} onChange={e => setMes(Number(e.target.value))} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {periodo === "ano" && (
                <div>
                  <Label>Ano</Label>
                  <Input type="number" value={ano} onChange={e => setAno(Number(e.target.value))} min={2020} max={2100} />
                  <p className="text-xs text-muted-foreground mt-1">Fecha todos os meses de {ano} que ainda não estão fechados.</p>
                </div>
              )}

              <div>
                <Label>Observações (opcional)</Label>
                <Input name="observacoes" placeholder="Ex.: Validado com contabilidade" />
              </div>
              <Button type="submit" disabled={busy} variant="brand" className="w-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirmar fechamento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-5">
        <h2 className="font-display font-bold mb-3 flex items-center gap-2"><Lock className="h-4 w-4 text-success" /> Períodos fechados ({fechados.length})</h2>
        {fechados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum período fechado ainda.</p>
        ) : (
          <div className="space-y-2">
            {fechados.map(f => (
              <div key={f.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <p className="font-medium">{rotuloFechamento(f)}</p>
                  <p className="text-xs text-muted-foreground">
                    Fechado em {new Date(f.fechado_em).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => reabrirMes(f.id)}>
                  <Unlock className="h-3 w-3" /> Reabrir
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {reabertos.length > 0 && (
        <Card className="p-5">
          <h2 className="font-display font-bold mb-3 flex items-center gap-2"><Unlock className="h-4 w-4 text-warning" /> Histórico de reaberturas</h2>
          <div className="space-y-2">
            {reabertos.map(f => (
              <div key={f.id} className="text-sm border-b border-border pb-2 last:border-0">
                <p className="font-medium">{rotuloFechamento(f)}</p>
                <p className="text-xs text-muted-foreground">
                  Fechado em {new Date(f.fechado_em).toLocaleString("pt-BR")} · Reaberto em {new Date(f.reaberto_em).toLocaleString("pt-BR")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function AuditLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [tabela, setTabela] = useState<string>("todas");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    let q = (supabase as any).from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
    if (tabela !== "todas") q = q.eq("tabela", tabela);
    const { data } = await q;
    setLogs(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [tabela]);

  function diff(antes: any, depois: any): string {
    if (!antes) return "—";
    if (!depois) return "—";
    const changes: string[] = [];
    Object.keys(depois).forEach(k => {
      if (JSON.stringify(antes[k]) !== JSON.stringify(depois[k])) {
        changes.push(`${k}: ${JSON.stringify(antes[k])} → ${JSON.stringify(depois[k])}`);
      }
    });
    return changes.slice(0, 3).join(" · ") || "—";
  }

  const tabelas = ["todas", "pagamentos_promotores", "faturas_clientes", "escalas", "clientes", "profiles", "fechamentos_mensais"];
  const labelAcao: Record<string, string> = { INSERT: "Criou", UPDATE: "Editou", DELETE: "Apagou" };
  const corAcao: Record<string, string> = {
    INSERT: "bg-success text-success-foreground",
    UPDATE: "bg-secondary text-secondary-foreground",
    DELETE: "bg-destructive text-destructive-foreground",
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2"><History className="h-7 w-7" /> Histórico de alterações</h1>
        <p className="text-muted-foreground text-sm">Log completo (últimas 200 movimentações) — append-only, não pode ser apagado.</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabelas.map(t => (
          <Button key={t} size="sm" variant={tabela === t ? "brand" : "outline"} onClick={() => setTabela(t)}>
            {t === "todas" ? "Todas" : t.replace("_", " ")}
          </Button>
        ))}
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3">Quando</th>
                <th className="text-left p-3">Quem</th>
                <th className="text-left p-3">Ação</th>
                <th className="text-left p-3">Tabela</th>
                <th className="text-left p-3">Mudanças</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhum registro.</td></tr>
              ) : logs.map(l => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-3 text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-xs">{l.user_email ?? "sistema"}</td>
                  <td className="p-3"><Badge className={corAcao[l.acao]}>{labelAcao[l.acao]}</Badge></td>
                  <td className="p-3 text-xs">{l.tabela}</td>
                  <td className="p-3 text-xs max-w-md truncate" title={diff(l.dados_antes, l.dados_depois)}>
                    {l.acao === "INSERT" ? "Novo registro criado" : l.acao === "DELETE" ? "Registro removido" : diff(l.dados_antes, l.dados_depois)}
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

export function AuditoriaPage() {
  return (
    <Tabs defaultValue="fechamento">
      <TabsList>
        <TabsTrigger value="fechamento"><Lock className="h-4 w-4 mr-1" /> Fechamento</TabsTrigger>
        <TabsTrigger value="historico"><History className="h-4 w-4 mr-1" /> Histórico</TabsTrigger>
      </TabsList>
      <TabsContent value="fechamento" className="mt-4"><FechamentoMensal /></TabsContent>
      <TabsContent value="historico" className="mt-4"><AuditLog /></TabsContent>
    </Tabs>
  );
}
