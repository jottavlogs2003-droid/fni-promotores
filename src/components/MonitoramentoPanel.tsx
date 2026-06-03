import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Clock } from "lucide-react";

const promotorIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(217 91% 35%);width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});
const lojaIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(48 96% 53%);width:14px;height:14px;border-radius:3px;border:2px solid white"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});

type Row = {
  id: string; hora_entrada: string; hora_saida: string | null;
  latitude_entrada: number; longitude_entrada: number;
  promotor_id: string; promotor_nome: string;
  loja_nome: string; loja_cidade: string | null;
  loja_lat: number | null; loja_lng: number | null; loja_raio: number | null;
};

export function MonitoramentoPanel({ clienteId }: { clienteId?: string | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Row | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "ativos">("todos");

  async function load() {
    setLoading(true);
    let q = supabase.from("check_ins")
      .select("id, hora_entrada, hora_saida, latitude_entrada, longitude_entrada, promotor_id, profiles!check_ins_promotor_id_fkey(nome), lojas!inner(nome, cidade, cliente_id, latitude, longitude, raio_metros)")
      .order("hora_entrada", { ascending: false })
      .limit(200);
    if (clienteId) q = q.eq("lojas.cliente_id", clienteId);
    const { data } = await q;
    const mapped: Row[] = (data ?? []).map((c: any) => ({
      id: c.id, hora_entrada: c.hora_entrada, hora_saida: c.hora_saida,
      latitude_entrada: c.latitude_entrada, longitude_entrada: c.longitude_entrada,
      promotor_id: c.promotor_id, promotor_nome: c.profiles?.nome ?? "Promotor",
      loja_nome: c.lojas?.nome ?? "—", loja_cidade: c.lojas?.cidade ?? null,
      loja_lat: c.lojas?.latitude ?? null, loja_lng: c.lojas?.longitude ?? null,
      loja_raio: c.lojas?.raio_metros ?? null,
    }));
    setRows(mapped); setLoading(false);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel(`mon-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "check_ins" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clienteId]);

  const visiveis = useMemo(() => filtro === "ativos" ? rows.filter(r => !r.hora_saida) : rows, [rows, filtro]);
  const ativos = rows.filter(r => !r.hora_saida).length;

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Monitoramento</h1>
          <p className="text-muted-foreground text-sm">Clique em uma linha para ver no mapa.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-success text-success-foreground">{ativos} em loja agora</Badge>
          <Button size="sm" variant={filtro === "todos" ? "brand" : "outline"} onClick={() => setFiltro("todos")}>Todos</Button>
          <Button size="sm" variant={filtro === "ativos" ? "brand" : "outline"} onClick={() => setFiltro("ativos")}>Ativos</Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3">Promotor</th>
              <th className="text-left p-3">Loja</th>
              <th className="text-left p-3">Cidade</th>
              <th className="text-left p-3">Entrada</th>
              <th className="text-left p-3">Saída</th>
              <th className="text-left p-3">Status</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando…</td></tr>
              ) : visiveis.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum registro.</td></tr>
              ) : visiveis.map(r => (
                <tr key={r.id} onClick={() => setSel(r)} className="border-b border-border last:border-0 hover:bg-primary/5 cursor-pointer">
                  <td className="p-3 font-medium">{r.promotor_nome}</td>
                  <td className="p-3">{r.loja_nome}</td>
                  <td className="p-3 text-xs text-muted-foreground">{r.loja_cidade ?? "—"}</td>
                  <td className="p-3 text-xs">{new Date(r.hora_entrada).toLocaleString("pt-BR")}</td>
                  <td className="p-3 text-xs">{r.hora_saida ? new Date(r.hora_saida).toLocaleString("pt-BR") : "—"}</td>
                  <td className="p-3">
                    {r.hora_saida
                      ? <Badge className="bg-muted text-muted-foreground">Concluído</Badge>
                      : <Badge className="bg-success text-success-foreground">Em loja</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!sel} onOpenChange={v => !v && setSel(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" /> {sel?.promotor_nome} — {sel?.loja_nome}
            </DialogTitle>
          </DialogHeader>
          {sel && (
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground flex items-center gap-3">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Entrada: {new Date(sel.hora_entrada).toLocaleString("pt-BR")}</span>
                {sel.hora_saida && <span>Saída: {new Date(sel.hora_saida).toLocaleString("pt-BR")}</span>}
              </div>
              <div className="h-[55vh] min-h-[360px] rounded-lg overflow-hidden border border-border">
                <MapContainer center={[sel.latitude_entrada, sel.longitude_entrada]} zoom={16} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
                  <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[sel.latitude_entrada, sel.longitude_entrada]} icon={promotorIcon}>
                    <Popup>{sel.promotor_nome}</Popup>
                  </Marker>
                  {sel.loja_lat && sel.loja_lng && (
                    <>
                      <Marker position={[sel.loja_lat, sel.loja_lng]} icon={lojaIcon}>
                        <Popup>{sel.loja_nome}</Popup>
                      </Marker>
                      <Circle center={[sel.loja_lat, sel.loja_lng]} radius={sel.loja_raio ?? 100}
                        pathOptions={{ color: "#1E40AF", fillOpacity: 0.08, weight: 1 }} />
                    </>
                  )}
                </MapContainer>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
