import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Users, Clock } from "lucide-react";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";

// fix marker icon paths (Leaflet padrão quebra com bundlers)
const iconAtivo = L.divIcon({
  className: "",
  html: `<div style="background:hsl(217 91% 35%);width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});
const iconLoja = L.divIcon({
  className: "",
  html: `<div style="background:hsl(48 96% 53%);width:14px;height:14px;border-radius:3px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});

type Ativo = {
  id: string;
  hora_entrada: string;
  latitude_entrada: number;
  longitude_entrada: number;
  promotor_nome: string;
  loja_nome: string;
  loja_lat: number | null;
  loja_lng: number | null;
  loja_raio: number | null;
};

export default function MapaAoVivo() {
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    const { data } = await supabase
      .from("check_ins")
      .select("id, hora_entrada, latitude_entrada, longitude_entrada, profiles!check_ins_promotor_id_fkey(nome), lojas(nome, latitude, longitude, raio_metros)")
      .is("hora_saida", null)
      .order("hora_entrada", { ascending: false })
      .limit(200);
    const mapped: Ativo[] = (data ?? []).map((c: any) => ({
      id: c.id,
      hora_entrada: c.hora_entrada,
      latitude_entrada: c.latitude_entrada,
      longitude_entrada: c.longitude_entrada,
      promotor_nome: c.profiles?.nome ?? "Promotor",
      loja_nome: c.lojas?.nome ?? "—",
      loja_lat: c.lojas?.latitude ?? null,
      loja_lng: c.lojas?.longitude ?? null,
      loja_raio: c.lojas?.raio_metros ?? null,
    }));
    setAtivos(mapped);
    setLoading(false);
  }

  useRealtimeRefresh(["check_ins", "lojas", "profiles"], carregar, [], 10000);

  const center = useMemo<[number, number]>(() => {
    if (ativos.length === 0) return [-23.55, -46.63]; // SP fallback
    const lat = ativos.reduce((s, a) => s + a.latitude_entrada, 0) / ativos.length;
    const lng = ativos.reduce((s, a) => s + a.longitude_entrada, 0) / ativos.length;
    return [lat, lng];
  }, [ativos]);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold">Mapa ao vivo</h1>
          <p className="text-muted-foreground text-sm">Promotores ativos em campo agora.</p>
        </div>
        <Badge className="bg-primary text-primary-foreground gap-1 text-sm py-1.5 px-3">
          <Users className="h-4 w-4" /> {ativos.length} em loja
        </Badge>
      </div>

      <Card className="overflow-hidden p-0 h-[60vh] min-h-[420px] relative">
        {loading ? (
          <div className="h-full grid place-items-center text-muted-foreground text-sm">Carregando mapa…</div>
        ) : (
          <MapContainer center={center} zoom={ativos.length ? 11 : 5} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {ativos.map((a) => (
              <Marker key={a.id} position={[a.latitude_entrada, a.longitude_entrada]} icon={iconAtivo}>
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-sm">{a.promotor_nome}</p>
                    <p className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.loja_nome}</p>
                    <p className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3 w-3" /> Entrada: {new Date(a.hora_entrada).toLocaleTimeString("pt-BR")}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
            {ativos.filter(a => a.loja_lat && a.loja_lng).map((a) => (
              <>
                <Marker key={`l-${a.id}`} position={[a.loja_lat!, a.loja_lng!]} icon={iconLoja}>
                  <Popup><p className="text-xs font-semibold">{a.loja_nome}</p></Popup>
                </Marker>
                {a.loja_raio && (
                  <Circle key={`c-${a.id}`} center={[a.loja_lat!, a.loja_lng!]} radius={a.loja_raio} pathOptions={{ color: "#1E40AF", fillOpacity: 0.05, weight: 1 }} />
                )}
              </>
            ))}
          </MapContainer>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3 text-sm">Lista de promotores ativos</h2>
        {ativos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum promotor em loja agora.</p>
        ) : (
          <div className="divide-y divide-border">
            {ativos.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{a.promotor_nome}</p>
                  <p className="text-xs text-muted-foreground">{a.loja_nome}</p>
                </div>
                <Badge className="bg-success text-success-foreground text-[10px]">
                  desde {new Date(a.hora_entrada).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
