import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Clock, MapPin, CheckCircle2, XCircle } from "lucide-react";

/**
 * Execuções dos promotores — detalhado: quem, onde, quando, score, fotos, checklist
 */
export default function ExecucoesView({ clienteId }: { clienteId?: string | null }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [periodo, setPeriodo] = useState<"hoje" | "7d" | "30d" | "todos">("7d");
  const [sel, setSel] = useState<any>(null);
  const [fotos, setFotos] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    let q = supabase.from("execucoes")
      .select(`
        id, score, loja_organizada, produto_exposto, preco_visivel, material_merchandising,
        observacoes, created_at,
        check_in_id,
        profiles!execucoes_promotor_id_fkey(nome, email, tipo_promotor, avatar_url),
        lojas!inner(nome, cidade, estado, cliente_id, clientes(nome)),
        check_ins!execucoes_check_in_id_fkey(hora_entrada, hora_saida, distancia_metros, selfie_url),
        fotos_execucao(id, url, tipo)
      `)
      .order("created_at", { ascending: false })
      .limit(500);
    const { data } = await q;
    let lista = data ?? [];
    if (clienteId) lista = lista.filter((e: any) => e.lojas?.cliente_id === clienteId);
    if (periodo !== "todos") {
      const dias = periodo === "hoje" ? 1 : periodo === "7d" ? 7 : 30;
      const limite = new Date(); limite.setDate(limite.getDate() - dias);
      lista = lista.filter((e: any) => new Date(e.created_at) >= limite);
    }
    setRows(lista);
    setLoading(false);
  }
  useEffect(() => { load(); }, [clienteId, periodo]);

  async function openDetalhe(e: any) {
    setSel(e);
    const { data } = await supabase.from("fotos_execucao").select("*").eq("execucao_id", e.id).order("created_at");
    setFotos(data ?? []);
  }

  const visiveis = rows.filter(r => {
    if (!filtro) return true;
    const f = filtro.toLowerCase();
    return (r.profiles?.nome ?? "").toLowerCase().includes(f)
      || (r.lojas?.nome ?? "").toLowerCase().includes(f)
      || (r.lojas?.clientes?.nome ?? "").toLowerCase().includes(f)
      || (r.lojas?.cidade ?? "").toLowerCase().includes(f);
  });

  function scoreBadge(s: number | null) {
    if (s == null) return <Badge className="bg-muted text-muted-foreground">—</Badge>;
    if (s >= 80) return <Badge className="bg-success text-success-foreground">{s}%</Badge>;
    if (s >= 50) return <Badge className="bg-warning text-warning-foreground">{s}%</Badge>;
    return <Badge className="bg-destructive text-destructive-foreground">{s}%</Badge>;
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold">Execuções dos promotores</h1>
          <p className="text-muted-foreground text-sm">{visiveis.length} execução(ões) — detalhe por promotor, loja, score e fotos.</p>
        </div>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <Label className="text-xs">Período</Label>
            <div className="flex gap-1">
              {(["hoje","7d","30d","todos"] as const).map(p => (
                <Button key={p} size="sm" variant={periodo === p ? "brand" : "outline"} onClick={() => setPeriodo(p)}>
                  {p === "hoje" ? "Hoje" : p === "todos" ? "Todos" : p}
                </Button>
              ))}
            </div>
          </div>
          <div className="w-64">
            <Label className="text-xs">Buscar (promotor, loja, cliente, cidade)</Label>
            <Input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Filtrar..." />
          </div>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3">Data</th>
                <th className="text-left p-3">Promotor</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Loja</th>
                <th className="text-left p-3">Cidade/UF</th>
                <th className="text-left p-3">Tempo em loja</th>
                <th className="text-center p-3">Checklist</th>
                <th className="text-center p-3">Score</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              : visiveis.length === 0 ? <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhuma execução no período.</td></tr>
              : visiveis.map(r => {
                const ci = r.check_ins;
                const dur = ci?.hora_entrada && ci?.hora_saida
                  ? Math.round((new Date(ci.hora_saida).getTime() - new Date(ci.hora_entrada).getTime()) / 60000)
                  : null;
                const checks = [r.loja_organizada, r.produto_exposto, r.preco_visivel, r.material_merchandising];
                const ok = checks.filter(Boolean).length;
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3 text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td className="p-3 font-medium">{r.profiles?.nome ?? "—"}
                      {r.profiles?.tipo_promotor && <div className="text-[10px] text-muted-foreground uppercase">{r.profiles.tipo_promotor.replace("_"," ")}</div>}
                    </td>
                    <td className="p-3 text-xs">{r.lojas?.clientes?.nome ?? "—"}</td>
                    <td className="p-3">{r.lojas?.nome ?? "—"}</td>
                    <td className="p-3 text-xs">{r.lojas?.cidade ?? "—"}{r.lojas?.estado ? `/${r.lojas.estado}` : ""}</td>
                    <td className="p-3 text-xs">{dur != null ? `${dur} min` : ci?.hora_entrada ? "Em loja" : "—"}</td>
                    <td className="p-3 text-center text-xs">{ok}/4</td>
                    <td className="p-3 text-center">{scoreBadge(r.score)}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openDetalhe(r)}>Ver</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!sel} onOpenChange={v => !v && setSel(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{sel?.profiles?.nome} · {sel?.lojas?.nome}</DialogTitle>
          </DialogHeader>
          {sel && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Entrada: {sel.check_ins?.hora_entrada ? new Date(sel.check_ins.hora_entrada).toLocaleString("pt-BR") : "—"}</div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Saída: {sel.check_ins?.hora_saida ? new Date(sel.check_ins.hora_saida).toLocaleString("pt-BR") : "—"}</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />Distância: {sel.check_ins?.distancia_metros != null ? `${Math.round(sel.check_ins.distancia_metros)} m` : "—"}</div>
                <div>Score: {scoreBadge(sel.score)}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Loja organizada", sel.loja_organizada],
                  ["Produto exposto", sel.produto_exposto],
                  ["Preço visível", sel.preco_visivel],
                  ["Material merchandising", sel.material_merchandising],
                ].map(([l, v]: any) => (
                  <div key={l} className="flex items-center gap-2 p-2 rounded border border-border">
                    {v ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                    <span>{l}</span>
                  </div>
                ))}
              </div>

              {sel.observacoes && (
                <div className="text-sm">
                  <Label>Observações</Label>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{sel.observacoes}</p>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-2"><Camera className="h-4 w-4" /><Label>Fotos ({fotos.length})</Label></div>
                {fotos.length === 0 ? <p className="text-xs text-muted-foreground">Sem fotos.</p> : (
                  <div className="grid grid-cols-3 gap-2">
                    {fotos.map(f => (
                      <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="block aspect-square rounded overflow-hidden border border-border">
                        <img src={f.url} alt={f.tipo ?? "foto"} className="w-full h-full object-cover hover:scale-105 transition" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {sel.check_ins?.selfie_url && (
                <div>
                  <Label>Selfie de check-in</Label>
                  <a href={sel.check_ins.selfie_url} target="_blank" rel="noreferrer">
                    <img src={sel.check_ins.selfie_url} alt="selfie" className="mt-1 w-32 h-32 object-cover rounded border border-border" />
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
