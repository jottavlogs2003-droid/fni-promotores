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

export function FechamentoMensal() {
  const { user } = useAuth();
  const [fechamentos, setFechamentos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState(new Date().getMonth() + 1);

  async function load() {
    const { data } = await (supabase as any).from("fechamentos_mensais")
      .select("*")
      .order("ano", { ascending: false })
      .order("mes", { ascending: false });
    setFechamentos(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function fecharMes(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await (supabase as any).from("fechamentos_mensais").insert({
      ano, mes, fechado_por: user.id,
      observacoes: fd.get("observacoes") || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${MESES[mes-1]}/${ano} fechado!`);
    setOpen(false);
    load();
  }

  async function reabrirMes(id: string) {
    if (!user) return;
    if (!confirm("Tem certeza? Reabrir um mês permite alterações em pagamentos, faturas e escalas desse período.")) return;
    const { error } = await (supabase as any).from("fechamentos_mensais")
      .update({ reaberto_em: new Date().toISOString(), reaberto_por: user.id })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Mês reaberto");
    load();
  }

  const fechados = fechamentos.filter(f => !f.reaberto_em);
  const reabertos = fechamentos.filter(f => f.reaberto_em);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Lock className="h-7 w-7" /> Fechamento mensal</h1>
          <p className="text-muted-foreground text-sm">Trava pagamentos, faturas e escalas de meses já encerrados.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="brand"><Lock className="h-4 w-4" /> Fechar mês</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Fechar mês</DialogTitle></DialogHeader>
            <form onSubmit={fecharMes} className="space-y-4">
              <div className="bg-warning/10 border border-warning/30 rounded-md p-3 text-sm flex gap-2">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <span>Após fechar, <strong>nenhum</strong> pagamento, fatura ou escala desse mês poderá ser editado ou apagado, exceto se reaberto.</span>
              </div>
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
        <h2 className="font-display font-bold mb-3 flex items-center gap-2"><Lock className="h-4 w-4 text-success" /> Meses fechados ({fechados.length})</h2>
        {fechados.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum mês fechado ainda.</p>
        ) : (
          <div className="space-y-2">
            {fechados.map(f => (
              <div key={f.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <p className="font-medium">{MESES[f.mes-1]} / {f.ano}</p>
                  <p className="text-xs text-muted-foreground">
                    Fechado em {new Date(f.fechado_em).toLocaleString("pt-BR")}
                    {f.observacoes && ` · ${f.observacoes}`}
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
                <p className="font-medium">{MESES[f.mes-1]} / {f.ano}</p>
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
