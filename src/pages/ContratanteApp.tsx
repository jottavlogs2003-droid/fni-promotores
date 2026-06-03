import { Fragment, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DesktopLayout } from "@/components/layouts/DesktopLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LayoutDashboard, Store, Camera, Users, AlertTriangle, FileText, Receipt, Loader2, Package, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ValidadesView from "./admin/ValidadesView";
import { MonitoramentoPanel } from "@/components/MonitoramentoPanel";

const items = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/lojas", label: "Lojas", icon: Store },
  { to: "/app/monitoramento", label: "Monitoramento", icon: MapPin },
  { to: "/app/execucoes", label: "Execuções", icon: Camera },
  { to: "/app/validades", label: "Validades", icon: Package },
  { to: "/app/faturas", label: "Faturas", icon: Receipt },
  { to: "/app/relatorios", label: "Relatórios", icon: FileText },
];

function ContratanteDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ lojas: 0, checkInsHoje: 0, rupturas: 0, fotos: 0 });
  const [recentes, setRecentes] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.cliente_id) return;
    (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data: lojas } = await supabase.from("lojas").select("id").eq("cliente_id", profile.cliente_id);
      const lojaIds = (lojas ?? []).map(l => l.id);
      const [ci, rupt, fts, recs] = await Promise.all([
        lojaIds.length ? supabase.from("check_ins").select("id", { count: "exact", head: true }).in("loja_id", lojaIds).gte("hora_entrada", today.toISOString()) : { count: 0 } as any,
        lojaIds.length ? supabase.from("rupturas").select("id", { count: "exact", head: true }).in("loja_id", lojaIds).eq("status", "aberta") : { count: 0 } as any,
        lojaIds.length ? supabase.from("fotos_execucao").select("id", { count: "exact", head: true }).in("loja_id", lojaIds) : { count: 0 } as any,
        lojaIds.length ? supabase.from("check_ins").select("*, lojas(nome), profiles!check_ins_promotor_id_fkey(nome)").in("loja_id", lojaIds).order("hora_entrada", { ascending: false }).limit(8) : { data: [] } as any,
      ]);
      setStats({ lojas: lojas?.length ?? 0, checkInsHoje: ci.count ?? 0, rupturas: rupt.count ?? 0, fotos: fts.count ?? 0 });
      setRecentes(recs.data ?? []);
    })();
  }, [profile]);

  if (!profile?.cliente_id) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Sua conta ainda não está vinculada a uma empresa contratante. Entre em contato com a FNI.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display font-bold">Painel do Contratante</h1>
        <p className="text-muted-foreground">Visão da execução nas suas lojas.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Suas lojas" value={stats.lojas} icon={Store} variant="primary" />
        <StatCard label="Check-ins hoje" value={stats.checkInsHoje} icon={Users} variant="secondary" />
        <StatCard label="Rupturas" value={stats.rupturas} icon={AlertTriangle} variant="warning" />
        <StatCard label="Fotos enviadas" value={stats.fotos} icon={Camera} variant="success" />
      </div>
      <Card className="p-5">
        <h2 className="font-display font-bold text-lg mb-4">Visitas recentes</h2>
        {recentes.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma visita ainda.</p> : recentes.map(r => (
          <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium">{r.profiles?.nome}</p>
              <p className="text-xs text-muted-foreground">{r.lojas?.nome} · {new Date(r.hora_entrada).toLocaleString("pt-BR")}</p>
            </div>
            <Badge className={r.hora_saida ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
              {r.hora_saida ? "Concluído" : "Em loja"}
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}

function GenericTable({ title, table, columns }: { title: string; table: string; columns: { key: string; label: string }[] }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { (supabase as any).from(table).select("*, lojas(nome), produtos(nome)").order("created_at", { ascending: false }).limit(100).then(({ data }: any) => setItems(data ?? [])); }, [table]);
  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="text-3xl font-display font-bold">{title}</h1>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">{columns.map(c => <th key={c.key} className="text-left p-3">{c.label}</th>)}</tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={columns.length} className="p-8 text-center text-muted-foreground">Sem registros.</td></tr> :
              items.map(it => (
                <tr key={it.id} className="border-b border-border hover:bg-muted/30">
                  {columns.map(c => <td key={c.key} className="p-3">
                    {c.key === "loja" ? it.lojas?.nome : c.key === "produto" ? it.produtos?.nome : c.key.includes("data") || c.key.includes("hora") || c.key === "created_at" ? new Date(it[c.key]).toLocaleString("pt-BR") : String(it[c.key] ?? "—")}
                  </td>)}
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function MinhasFaturas() {
  const { profile } = useAuth();
  const [faturas, setFaturas] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<any[]>([]);
  const [loadingDet, setLoadingDet] = useState(false);

  useEffect(() => {
    if (!profile?.cliente_id) return;
    supabase.from("faturas_clientes").select("*").eq("cliente_id", profile.cliente_id).order("created_at", { ascending: false }).then(({ data }) => setFaturas(data ?? []));
  }, [profile]);

  async function abrir(f: any) {
    if (openId === f.id) { setOpenId(null); return; }
    setOpenId(f.id); setLoadingDet(true); setDetalhe([]);
    const { data } = await supabase.from("escalas")
      .select("data, hora_inicio, hora_fim, duracao_horas, diarias, lojas!inner(nome, cliente_id), profiles!escalas_promotor_id_fkey(nome)")
      .gte("data", f.periodo_inicio).lte("data", f.periodo_fim)
      .eq("lojas.cliente_id", profile!.cliente_id!).order("data");
    setDetalhe(data ?? []); setLoadingDet(false);
  }

  const aberto = faturas.filter(f => f.status !== "paga").reduce((s, f) => s + Number(f.valor_total || 0), 0);
  return (
    <div className="space-y-4 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display font-bold">Faturas</h1>
        <p className="text-foreground/70 text-sm">Em aberto: <strong>{BRL(aberto)}</strong></p>
      </div>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border">
            <th className="text-left p-3">Nº</th><th className="text-left p-3">Período</th><th className="text-right p-3">Diárias</th><th className="text-right p-3">Valor</th><th className="text-left p-3">Vencto</th><th className="text-left p-3">Status</th><th></th>
          </tr></thead>
          <tbody>
            {faturas.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-foreground/60">Nenhuma fatura ainda.</td></tr> :
              faturas.map(f => (
                <Fragment key={f.id}>
                  <tr className="border-b border-border hover:bg-card/40">
                    <td className="p-3 font-mono text-xs">{f.numero_fatura}</td>
                    <td className="p-3 text-xs">{f.periodo_inicio} → {f.periodo_fim}</td>
                    <td className="p-3 text-right">{Number(f.total_diarias).toFixed(1)}</td>
                    <td className="p-3 text-right font-semibold">{BRL(Number(f.valor_total))}</td>
                    <td className="p-3 text-xs">{f.data_vencimento ?? "—"}</td>
                    <td className="p-3"><Badge className={f.status === "paga" ? "bg-success text-success-foreground" : f.status === "vencida" ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}>{f.status}</Badge></td>
                    <td className="p-3"><Button size="sm" variant="outline" onClick={() => abrir(f)}>{openId === f.id ? "Fechar" : "Detalhes"}</Button></td>
                  </tr>
                  {openId === f.id && (
                    <tr><td colSpan={7} className="bg-muted/30 p-4">
                      {loadingDet ? <p className="text-xs text-muted-foreground">Carregando...</p> : detalhe.length === 0 ? <p className="text-xs text-muted-foreground">Sem turnos no período.</p> : (
                        <table className="w-full text-xs">
                          <thead><tr className="border-b border-border">
                            <th className="text-left p-2">Data</th><th className="text-left p-2">Promotor</th><th className="text-left p-2">Loja</th><th className="text-left p-2">Horário</th><th className="text-right p-2">Horas</th><th className="text-right p-2">Diárias</th>
                          </tr></thead>
                          <tbody>
                            {detalhe.map((d, i) => (
                              <tr key={i} className="border-b border-border last:border-0">
                                <td className="p-2">{new Date(d.data).toLocaleDateString("pt-BR")}</td>
                                <td className="p-2 font-medium">{d.profiles?.nome ?? "—"}</td>
                                <td className="p-2">{d.lojas?.nome}</td>
                                <td className="p-2">{d.hora_inicio?.slice(0,5)}–{d.hora_fim?.slice(0,5)}</td>
                                <td className="p-2 text-right">{Number(d.duracao_horas).toFixed(1)}</td>
                                <td className="p-2 text-right">{Number(d.diarias).toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </td></tr>
                  )}
                </Fragment>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function RelatoriosContratante() {
  const { profile } = useAuth();
  const [inicio, setInicio] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10); });
  const [fim, setFim] = useState(() => new Date().toISOString().slice(0,10));
  const [tipo, setTipo] = useState<"loja" | "promotor" | "detalhado">("loja");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  async function carregar() {
    if (!profile?.cliente_id) return [];
    const { data } = await supabase.from("escalas")
      .select("data, hora_inicio, hora_fim, duracao_horas, diarias, status, lojas!inner(nome, cidade, cliente_id), profiles!escalas_promotor_id_fkey(nome)")
      .gte("data", inicio).lte("data", fim).eq("lojas.cliente_id", profile.cliente_id).order("data");
    return data ?? [];
  }

  function agrupar(dados: any[]) {
    if (tipo === "detalhado") {
      return dados.map(r => ({
        Data: new Date(r.data).toLocaleDateString("pt-BR"),
        Promotor: r.profiles?.nome ?? "—",
        Loja: r.lojas?.nome ?? "—",
        Cidade: r.lojas?.cidade ?? "—",
        Horario: `${r.hora_inicio?.slice(0,5)}–${r.hora_fim?.slice(0,5)}`,
        Horas: Number(r.duracao_horas),
        Diarias: Number(r.diarias),
        Status: r.status,
      }));
    }
    const map = new Map<string, any>();
    dados.forEach(r => {
      const chave = tipo === "loja" ? (r.lojas?.nome ?? "—") : (r.profiles?.nome ?? "—");
      const cur = map.get(chave) ?? { [tipo === "loja" ? "Loja" : "Promotor"]: chave, Turnos: 0, Horas: 0, Diarias: 0 };
      cur.Turnos += 1; cur.Horas += Number(r.duracao_horas); cur.Diarias += Number(r.diarias);
      map.set(chave, cur);
    });
    return Array.from(map.values());
  }

  async function gerar() { setBusy(true); try { setRows(agrupar(await carregar())); } finally { setBusy(false); } }

  async function pdf() {
    setBusy(true);
    try {
      const [{ default: jsPDF }, autoTable] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const dados = agrupar(await carregar());
      if (!dados.length) { toast.info("Sem dados no período."); return; }
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16); doc.text(`Relatório por ${tipo}`, 14, 15);
      doc.setFontSize(10); doc.text(`Período: ${inicio} a ${fim}`, 14, 22);
      const headers = Object.keys(dados[0]);
      const body = dados.map(r => headers.map(h => { const v = (r as any)[h]; return typeof v === "number" ? v.toFixed(1) : String(v ?? ""); }));
      (autoTable as any).default(doc, { head: [headers], body, startY: 28, styles: { fontSize: 8 }, headStyles: { fillColor: [30, 64, 175] } });
      doc.save(`relatorio-${tipo}-${inicio}-a-${fim}.pdf`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function excel() {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const dados = agrupar(await carregar());
      if (!dados.length) { toast.info("Sem dados no período."); return; }
      const ws = XLSX.utils.json_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Relatorio");
      XLSX.writeFile(wb, `relatorio-${tipo}-${inicio}-a-${fim}.xlsx`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="text-3xl font-display font-bold">Relatórios</h1>
      <Card className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {(["loja","promotor","detalhado"] as const).map(t => (
            <button key={t} type="button" onClick={() => { setTipo(t); setRows([]); }}
              className={`p-3 rounded-lg border text-left ${tipo === t ? "border-primary bg-primary/10" : "border-input hover:bg-muted/40"}`}>
              <p className="font-semibold text-sm capitalize">Por {t}</p>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div><Label>Início</Label><Input type="date" value={inicio} onChange={e => setInicio(e.target.value)} /></div>
          <div><Label>Fim</Label><Input type="date" value={fim} onChange={e => setFim(e.target.value)} /></div>
          <Button onClick={gerar} variant="outline" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Pré-visualizar</Button>
          <div className="flex gap-2">
            <Button onClick={pdf} variant="brand" disabled={busy} className="flex-1">PDF</Button>
            <Button onClick={excel} variant="brand" disabled={busy} className="flex-1">Excel</Button>
          </div>
        </div>
      </Card>
      {rows.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                {Object.keys(rows[0]).map(h => <th key={h} className="text-left p-3 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                    {Object.values(r).map((v: any, j) => <td key={j} className="p-3">{typeof v === "number" ? v.toFixed(1) : String(v ?? "—")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default function ContratanteApp() {
  const { profile } = useAuth();
  return (
    <DesktopLayout items={items} title="Contratante">
      <Routes>
        <Route index element={<ContratanteDashboard />} />
        <Route path="lojas" element={<GenericTable title="Suas lojas" table="lojas" columns={[{ key: "nome", label: "Nome" }, { key: "cidade", label: "Cidade" }, { key: "estado", label: "UF" }]} />} />
        <Route path="execucoes" element={<GenericTable title="Execuções" table="execucoes" columns={[{ key: "loja", label: "Loja" }, { key: "score", label: "Score" }, { key: "observacoes", label: "Observações" }, { key: "created_at", label: "Quando" }]} />} />
        <Route path="rupturas" element={<Navigate to="/app/validades" replace />} />
        <Route path="validades" element={<ValidadesView clienteId={profile?.cliente_id} />} />
        <Route path="faturas" element={<MinhasFaturas />} />
        <Route path="relatorios" element={<RelatoriosContratante />} />
        <Route path="monitoramento" element={<MonitoramentoPanel clienteId={profile?.cliente_id ?? null} />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </DesktopLayout>
  );
}
