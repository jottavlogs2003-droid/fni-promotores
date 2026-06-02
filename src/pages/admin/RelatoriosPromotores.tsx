import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, User, Users, Calendar } from "lucide-react";
import { toast } from "sonner";

type Periodo = "semana" | "mes" | "ano";

function rangeDe(periodo: Periodo, ref: Date): { inicio: string; fim: string; label: string } {
  const d = new Date(ref);
  if (periodo === "semana") {
    const dow = d.getDay(); // 0=dom
    const seg = new Date(d); seg.setDate(d.getDate() - ((dow + 6) % 7));
    const dom = new Date(seg); dom.setDate(seg.getDate() + 6);
    return {
      inicio: seg.toISOString().slice(0, 10),
      fim: dom.toISOString().slice(0, 10),
      label: `Semana ${seg.toLocaleDateString("pt-BR")} – ${dom.toLocaleDateString("pt-BR")}`,
    };
  }
  if (periodo === "mes") {
    const ini = new Date(d.getFullYear(), d.getMonth(), 1);
    const fim = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return {
      inicio: ini.toISOString().slice(0, 10),
      fim: fim.toISOString().slice(0, 10),
      label: `${ini.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`,
    };
  }
  const ini = new Date(d.getFullYear(), 0, 1);
  const fim = new Date(d.getFullYear(), 11, 31);
  return { inicio: ini.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10), label: `Ano ${d.getFullYear()}` };
}

export default function RelatoriosPromotores() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [ref, setRef] = useState(() => new Date().toISOString().slice(0, 10));
  const [escopo, setEscopo] = useState<"todos" | "individual">("todos");
  const [promotorId, setPromotorId] = useState<string>("");
  const [promotores, setPromotores] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [dados, setDados] = useState<any[]>([]);
  const [resumo, setResumo] = useState<Record<string, { nome: string; turnos: number; horas: number; lojas: Set<string> }>>({});

  const intervalo = useMemo(() => rangeDe(periodo, new Date(ref + "T00:00:00")), [periodo, ref]);

  useEffect(() => {
    (async () => {
      const { data: profs } = await supabase.from("profiles").select("id, nome").order("nome");
      if (!profs) { setPromotores([]); return; }
      const ids = profs.map(p => p.id);
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "promotor").in("user_id", ids);
      const set = new Set((roles ?? []).map((r: any) => r.user_id));
      setPromotores(profs.filter(p => set.has(p.id)));
    })();
  }, []);

  async function carregar() {
    setBusy(true);
    try {
      // Usa check_ins (dados reais de presença com horários) + escalas como fallback
      let q = supabase.from("check_ins")
        .select("*, lojas(nome, cidade, clientes(nome)), profiles!check_ins_promotor_id_fkey(nome, valor_diaria)")
        .gte("hora_entrada", intervalo.inicio + "T00:00:00")
        .lte("hora_entrada", intervalo.fim + "T23:59:59")
        .order("hora_entrada", { ascending: true });
      if (escopo === "individual" && promotorId) q = q.eq("promotor_id", promotorId);

      const { data, error } = await q;
      if (error) throw error;
      const rows = data ?? [];
      setDados(rows);

      const r: Record<string, any> = {};
      rows.forEach(c => {
        const pid = c.promotor_id;
        const nome = c.profiles?.nome ?? "—";
        if (!r[pid]) r[pid] = { nome, turnos: 0, horas: 0, lojas: new Set<string>() };
        r[pid].turnos += 1;
        if (c.hora_saida) {
          const h = (new Date(c.hora_saida).getTime() - new Date(c.hora_entrada).getTime()) / 3_600_000;
          r[pid].horas += Math.max(0, h);
        }
        if (c.lojas?.nome) r[pid].lojas.add(c.lojas.nome);
      });
      setResumo(r);
      if (rows.length === 0) toast.info("Nenhum check-in no período.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  function exportarLinha(c: any) {
    const ent = new Date(c.hora_entrada);
    const sai = c.hora_saida ? new Date(c.hora_saida) : null;
    return {
      Data: ent.toLocaleDateString("pt-BR"),
      Promotor: c.profiles?.nome ?? "—",
      Cliente: c.lojas?.clientes?.nome ?? "—",
      Loja: c.lojas?.nome ?? "—",
      Cidade: c.lojas?.cidade ?? "—",
      Entrada: ent.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      Saida: sai ? sai.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Em loja",
      Horas: sai ? ((sai.getTime() - ent.getTime()) / 3_600_000).toFixed(2) : "—",
    };
  }

  async function exportarExcel() {
    if (dados.length === 0) { toast.info("Gere o relatório primeiro."); return; }
    const XLSX = await import("xlsx");
    const linhas = dados.map(exportarLinha);
    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detalhado");
    const resumoArr = Object.values(resumo).map((r: any) => ({
      Promotor: r.nome, Turnos: r.turnos, "Horas totais": r.horas.toFixed(1), Lojas: r.lojas.size,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumoArr), "Resumo");
    XLSX.writeFile(wb, `promotores-${periodo}-${intervalo.inicio}.xlsx`);
    toast.success("Excel gerado");
  }

  async function exportarPDF() {
    if (dados.length === 0) { toast.info("Gere o relatório primeiro."); return; }
    const [{ default: jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text(`FNI Promotores — Relatório ${periodo}`, 14, 15);
    doc.setFontSize(10);
    doc.text(intervalo.label, 14, 22);
    const linhas = dados.map(exportarLinha);
    const headers = Object.keys(linhas[0]);
    (autoTableMod as any).default(doc, {
      head: [headers],
      body: linhas.map(r => headers.map(h => String((r as any)[h]))),
      startY: 28, styles: { fontSize: 8 }, headStyles: { fillColor: [30, 64, 175] },
    });
    doc.save(`promotores-${periodo}-${intervalo.inicio}.pdf`);
    toast.success("PDF gerado");
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2"><FileText className="h-7 w-7" /> Relatórios de Promotores</h1>
        <p className="text-muted-foreground text-sm">Semanal, mensal ou anual · todos os promotores ou individual · cada loja com horário de entrada/saída.</p>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <Label className="mb-2 block">Período</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["semana", "mes", "ano"] as Periodo[]).map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                className={`p-3 rounded-lg border transition-base text-sm font-medium ${periodo === p ? "border-primary bg-primary/10 text-primary" : "border-input hover:bg-muted/40"}`}>
                <Calendar className="h-4 w-4 mx-auto mb-1" />
                {p === "semana" ? "Semanal" : p === "mes" ? "Mensal" : "Anual"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Data de referência</Label>
            <Input type="date" value={ref} onChange={e => setRef(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">{intervalo.label}</p>
          </div>
          <div>
            <Label>Escopo</Label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setEscopo("todos")} className={`p-2 rounded-md border text-sm flex items-center justify-center gap-1 ${escopo === "todos" ? "border-primary bg-primary/10" : "border-input"}`}>
                <Users className="h-4 w-4" /> Todos
              </button>
              <button onClick={() => setEscopo("individual")} className={`p-2 rounded-md border text-sm flex items-center justify-center gap-1 ${escopo === "individual" ? "border-primary bg-primary/10" : "border-input"}`}>
                <User className="h-4 w-4" /> Individual
              </button>
            </div>
          </div>
          <div>
            <Label>Promotor {escopo === "individual" && "*"}</Label>
            <select disabled={escopo === "todos"} value={promotorId} onChange={e => setPromotorId(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50">
              <option value="">Selecione…</option>
              {promotores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={carregar} disabled={busy || (escopo === "individual" && !promotorId)} variant="brand">
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Gerar relatório
          </Button>
          <Button onClick={exportarPDF} variant="outline" disabled={dados.length === 0}>PDF</Button>
          <Button onClick={exportarExcel} variant="outline" disabled={dados.length === 0}>Excel</Button>
        </div>
      </Card>

      {Object.keys(resumo).length > 0 && (
        <Card className="p-5">
          <h2 className="font-display font-bold mb-3">Resumo por promotor</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left p-2">Promotor</th>
                <th className="text-right p-2">Turnos</th>
                <th className="text-right p-2">Horas totais</th>
                <th className="text-right p-2">Lojas atendidas</th>
              </tr></thead>
              <tbody>
                {Object.entries(resumo).map(([id, r]: any) => (
                  <tr key={id} className="border-b border-border last:border-0">
                    <td className="p-2 font-medium">{r.nome}</td>
                    <td className="p-2 text-right">{r.turnos}</td>
                    <td className="p-2 text-right">{r.horas.toFixed(1)}h</td>
                    <td className="p-2 text-right">{r.lojas.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {dados.length > 0 && (
        <Card>
          <div className="p-4 border-b border-border">
            <h2 className="font-display font-bold">Detalhado · {dados.length} turnos</h2>
            <p className="text-xs text-muted-foreground">Cada loja atendida com horário de entrada e saída</p>
          </div>
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left p-3">Data</th>
                  <th className="text-left p-3">Promotor</th>
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Loja</th>
                  <th className="text-left p-3">Entrada</th>
                  <th className="text-left p-3">Saída</th>
                  <th className="text-right p-3">Horas</th>
                </tr>
              </thead>
              <tbody>
                {dados.map(c => {
                  const ent = new Date(c.hora_entrada);
                  const sai = c.hora_saida ? new Date(c.hora_saida) : null;
                  const horas = sai ? ((sai.getTime() - ent.getTime()) / 3_600_000).toFixed(2) : "—";
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-xs">{ent.toLocaleDateString("pt-BR")}</td>
                      <td className="p-3 font-medium">{c.profiles?.nome ?? "—"}</td>
                      <td className="p-3 text-xs">{c.lojas?.clientes?.nome ?? "—"}</td>
                      <td className="p-3">{c.lojas?.nome ?? "—"}</td>
                      <td className="p-3 text-xs">{ent.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="p-3 text-xs">{sai ? sai.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : <Badge className="bg-warning text-warning-foreground">Em loja</Badge>}</td>
                      <td className="p-3 text-right">{horas}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
