import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Visualização (admin/contratante) das validades cadastradas pelos promotores.
 * Inclui status calculado pelo prazo até vencer.
 */
export default function ValidadesView({ clienteId }: { clienteId?: string | null }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from("validades")
        .select("*, produtos(nome, sku, marca, cliente_id), lojas(nome, cidade, cliente_id), profiles!validades_promotor_id_fkey(nome)")
        .order("data_validade", { ascending: true });
      const { data } = await q;
      let lista = data ?? [];
      if (clienteId) {
        lista = lista.filter((v: any) => v.lojas?.cliente_id === clienteId || v.produtos?.cliente_id === clienteId);
      }
      setRows(lista);
      setLoading(false);
    })();
  }, [clienteId]);

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  function statusValidade(d: string) {
    const dv = new Date(d);
    const dias = Math.floor((dv.getTime() - hoje.getTime()) / 86400000);
    if (dias < 0) return { label: "Vencido", cls: "bg-destructive text-destructive-foreground", dias };
    if (dias <= 15) return { label: `${dias}d (crítico)`, cls: "bg-destructive/80 text-destructive-foreground", dias };
    if (dias <= 30) return { label: `${dias}d (alerta)`, cls: "bg-warning text-warning-foreground", dias };
    return { label: `${dias}d`, cls: "bg-success text-success-foreground", dias };
  }

  const visiveis = rows.filter(r => {
    if (!filtro) return true;
    const f = filtro.toLowerCase();
    return (r.produtos?.nome ?? "").toLowerCase().includes(f)
      || (r.lojas?.nome ?? "").toLowerCase().includes(f)
      || (r.profiles?.nome ?? "").toLowerCase().includes(f);
  });

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display font-bold">Controle de validades</h1>
          <p className="text-muted-foreground text-sm">{visiveis.length} registro(s) — produtos próximos do vencimento aparecem destacados.</p>
        </div>
        <div className="w-full md:w-72">
          <Label>Buscar (produto, loja, promotor)</Label>
          <Input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Filtrar..." />
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-3">Produto</th>
                <th className="text-left p-3">Loja</th>
                <th className="text-left p-3">Promotor</th>
                <th className="text-left p-3">Validade</th>
                <th className="text-right p-3">Qtd</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Foto</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              : visiveis.length === 0 ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Sem validades registradas.</td></tr>
              : visiveis.map(r => {
                const s = statusValidade(r.data_validade);
                return (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">{r.produtos?.nome ?? "—"}{r.produtos?.sku ? <span className="text-xs text-muted-foreground"> · {r.produtos.sku}</span> : null}</td>
                    <td className="p-3">{r.lojas?.nome ?? "—"} <span className="text-xs text-muted-foreground">{r.lojas?.cidade}</span></td>
                    <td className="p-3 text-xs">{r.profiles?.nome ?? "—"}</td>
                    <td className="p-3 text-xs">{new Date(r.data_validade).toLocaleDateString("pt-BR")}</td>
                    <td className="p-3 text-right">{r.quantidade ?? "—"}</td>
                    <td className="p-3"><Badge className={s.cls}>{s.label}</Badge></td>
                    <td className="p-3">{r.foto_url ? <a href={r.foto_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs">Ver foto</a> : <span className="text-muted-foreground text-xs">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
