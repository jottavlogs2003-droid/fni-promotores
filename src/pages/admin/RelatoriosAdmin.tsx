import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RelatoriosAdmin() {
  const [tipo, setTipo] = useState<"loja" | "promotor" | "cliente" | "detalhado">("loja");
  const [inicio, setInicio] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0,10); });
  const [fim, setFim] = useState(() => new Date().toISOString().slice(0,10));
  const [busy, setBusy] = useState(false);
  const [previa, setPrevia] = useState<any[]>([]);

  // Filtros
  const [filtroLoja, setFiltroLoja] = useState<string>("");
  const [filtroPromotor, setFiltroPromotor] = useState<string>("");
  const [filtroCliente, setFiltroCliente] = useState<string>("");
  const [lojas, setLojas] = useState<any[]>([]);
  const [promotores, setPromotores] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: ls }, { data: ps }, { data: cs }] = await Promise.all([
        supabase.from("lojas").select("id, nome, cliente_id").eq("ativo", true).order("nome"),
        supabase.from("profiles").select("id, nome").order("nome"),
        supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome"),
      ]);
      setLojas(ls ?? []); setPromotores(ps ?? []); setClientes(cs ?? []);
    })();
  }, []);

  async function carregarDados() {
    let q = supabase.from("escalas")
      .select("*, profiles!escalas_promotor_id_fkey(nome), lojas!inner(nome, cidade, cliente_id, clientes(nome, valor_diaria_cobrada))")
      .gte("data", inicio).lte("data", fim);
    if (filtroLoja) q = q.eq("loja_id", filtroLoja);
    if (filtroPromotor) q = q.eq("promotor_id", filtroPromotor);
    if (filtroCliente) q = q.eq("lojas.cliente_id", filtroCliente);
    const { data: escalas } = await q.order("data");
    const ids = Array.from(new Set((escalas ?? []).map((r: any) => r.promotor_id).filter(Boolean)));
    const { data: fin } = ids.length
      ? await supabase.from("profiles_financeiro").select("id, valor_diaria").in("id", ids)
      : { data: [] as any[] } as any;
    const finMap = new Map<string, any>((fin ?? []).map((f: any) => [f.id, f]));
    return (escalas ?? []).map((r: any) => ({
      ...r,
      profiles: { ...(r.profiles ?? {}), valor_diaria: finMap.get(r.promotor_id)?.valor_diaria ?? 0 },
    }));
  }

  function agrupar(rows: any[]) {
    if (tipo === "detalhado") {
      return rows.map(r => ({
        Data: new Date(r.data).toLocaleDateString("pt-BR"),
        Cliente: r.lojas?.clientes?.nome ?? "—",
        Loja: r.lojas?.nome ?? "—",
        Cidade: r.lojas?.cidade ?? "—",
        Promotor: r.profiles?.nome ?? "—",
        Turno: r.turno === 2 ? "Tarde" : "Manhã",
        Horario: `${r.hora_inicio?.slice(0,5)}–${r.hora_fim?.slice(0,5)}`,
        Horas: Number(r.duracao_horas),
        Diarias: Number(r.diarias),
        Status: r.status,
        Custo: Number(r.diarias) * Number(r.profiles?.valor_diaria ?? 0),
        Receita: Number(r.diarias) * Number(r.lojas?.clientes?.valor_diaria_cobrada ?? 0),
      }));
    }
    const map = new Map<string, any>();
    rows.forEach(r => {
      let chave = ""; let extra: any = {};
      if (tipo === "loja") { chave = r.lojas?.nome ?? "—"; extra = { Cliente: r.lojas?.clientes?.nome ?? "—", Cidade: r.lojas?.cidade ?? "—" }; }
      else if (tipo === "promotor") { chave = r.profiles?.nome ?? "—"; }
      else { chave = r.lojas?.clientes?.nome ?? "—"; }
      const cur: any = map.get(chave) ?? { [tipo === "loja" ? "Loja" : tipo === "promotor" ? "Promotor" : "Cliente"]: chave, ...extra, Turnos: 0, Horas: 0, Diarias: 0, Custo: 0, Receita: 0 };
      cur.Turnos += 1;
      cur.Horas += Number(r.duracao_horas);
      cur.Diarias += Number(r.diarias);
      cur.Custo += Number(r.diarias) * Number(r.profiles?.valor_diaria ?? 0);
      cur.Receita += Number(r.diarias) * Number(r.lojas?.clientes?.valor_diaria_cobrada ?? 0);
      map.set(chave, cur);
    });
    return Array.from(map.values()).map((x: any) => ({ ...x, Lucro: x.Receita - x.Custo }));
  }

  async function gerarPrevia() {
    setBusy(true);
    try { setPrevia(agrupar(await carregarDados())); }
    finally { setBusy(false); }
  }

  async function exportarExcel() {
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const dados = agrupar(await carregarDados());
      if (dados.length === 0) { toast.info("Sem dados no período."); return; }
      const ws = XLSX.utils.json_to_sheet(dados);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Por ${tipo}`);
      XLSX.writeFile(wb, `relatorio-${tipo}-${inicio}-a-${fim}.xlsx`);
      toast.success("Excel gerado!");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  async function exportarPDF() {
    setBusy(true);
    try {
      const [{ default: jsPDF }, autoTableMod] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const dados = agrupar(await carregarDados());
      if (dados.length === 0) { toast.info("Sem dados no período."); return; }
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text(`FNI Promotores — Relatório por ${tipo}`, 14, 15);
      doc.setFontSize(10);
      doc.text(`Período: ${inicio} a ${fim}`, 14, 22);
      const headers = Object.keys(dados[0]);
      const body = dados.map(r => headers.map(h => {
        const v = (r as any)[h];
        return typeof v === "number" ? (h === "Custo" || h === "Receita" || h === "Lucro" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : v.toFixed(1)) : String(v ?? "");
      }));
      (autoTableMod as any).default(doc, { head: [headers], body, startY: 28, styles: { fontSize: 8 }, headStyles: { fillColor: [30, 64, 175] } });
      doc.save(`relatorio-${tipo}-${inicio}-a-${fim}.pdf`);
      toast.success("PDF gerado!");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  }

  const opcoes = [
    { v: "loja", t: "Por loja", d: "Total de turnos, diárias, custo e receita por loja" },
    { v: "promotor", t: "Por promotor", d: "Performance individual e valor a pagar" },
    { v: "cliente", t: "Por cliente", d: "Visão consolidada por contratante" },
    { v: "detalhado", t: "Detalhado", d: "Cada turno: cliente → loja → promotor (linha por linha)" },
  ] as const;

  return (
    <div className="space-y-5">
      <Card className="p-5 space-y-4">
        <div>
          <Label className="mb-2 block">Tipo de agrupamento</Label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {opcoes.map(o => (
              <button key={o.v} type="button" onClick={() => { setTipo(o.v); setPrevia([]); }}
                className={`text-left p-3 rounded-lg border transition-base ${tipo === o.v ? "border-primary bg-primary/10" : "border-input hover:bg-muted/40"}`}>
                <p className="font-semibold text-sm">{o.t}</p>
                <p className="text-xs text-muted-foreground mt-1">{o.d}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Filtrar por cliente</Label>
            <select value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Todos os clientes</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <Label>Filtrar por loja</Label>
            <select value={filtroLoja} onChange={e => setFiltroLoja(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Todas as lojas</option>
              {lojas.filter(l => !filtroCliente || l.cliente_id === filtroCliente).map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
          <div>
            <Label>Filtrar por promotor</Label>
            <select value={filtroPromotor} onChange={e => setFiltroPromotor(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Todos os promotores</option>
              {promotores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div><Label>Início</Label><Input type="date" value={inicio} onChange={e => setInicio(e.target.value)} /></div>
          <div><Label>Fim</Label><Input type="date" value={fim} onChange={e => setFim(e.target.value)} /></div>
          <Button onClick={gerarPrevia} variant="outline" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Pré-visualizar
          </Button>
          <div className="flex gap-2">
            <Button onClick={exportarPDF} variant="brand" disabled={busy} className="flex-1">PDF</Button>
            <Button onClick={exportarExcel} variant="brand" disabled={busy} className="flex-1">Excel</Button>
          </div>
        </div>
      </Card>

      {previa.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                {Object.keys(previa[0]).map(h => <th key={h} className="text-left p-3 font-semibold">{h}</th>)}
              </tr></thead>
              <tbody>
                {previa.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                    {Object.entries(r).map(([k, v]: any, j) => (
                      <td key={j} className="p-3">{typeof v === "number" ? (k === "Custo" || k === "Receita" || k === "Lucro" ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : v.toFixed(1)) : String(v ?? "—")}</td>
                    ))}
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
