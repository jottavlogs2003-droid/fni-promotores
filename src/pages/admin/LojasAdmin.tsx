import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, MapPin, Pencil } from "lucide-react";
import { toast } from "sonner";

type Loja = any;

// Tenta extrair lat/lng de um link do Google Maps ou texto "lat, lng"
function parseLatLng(input: string): { lat: number; lng: number } | null {
  if (!input) return null;
  const s = input.trim();
  // padrões: "@-23.55,-46.63" | "!3d-23.55!4d-46.63" | "q=-23.55,-46.63" | "-23.55, -46.63"
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
}

export default function LojasAdmin() {
  const [items, setItems] = useState<Loja[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Loja | null>(null);

  async function load() {
    const { data } = await supabase.from("lojas").select("*, clientes(nome)").order("created_at", { ascending: false });
    setItems(data ?? []);
  }
  useEffect(() => {
    load();
    supabase.from("clientes").select("id,nome").order("nome").then(({ data }) => setClientes(data ?? []));
  }, []);

  function openNovo() { setEditing(null); setOpen(true); }
  function openEditar(l: Loja) { setEditing(l); setOpen(true); }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const link = String(fd.get("maps_link") ?? "").trim();
    let lat: number | null = editing?.latitude ?? null;
    let lng: number | null = editing?.longitude ?? null;
    if (link) {
      const parsed = parseLatLng(link);
      if (!parsed) { toast.error("Não foi possível ler as coordenadas do link. Cole um link do Google Maps válido."); return; }
      lat = parsed.lat; lng = parsed.lng;
    }
    if (!lat || !lng) { toast.error("Coordenadas obrigatórias: cole o link do Google Maps da loja."); return; }

    const raio = Number(fd.get("raio_metros") || 100);
    const payload: any = {
      cliente_id: fd.get("cliente_id"),
      nome: fd.get("nome"),
      endereco: fd.get("endereco") || null,
      cidade: fd.get("cidade") || null,
      estado: fd.get("estado") || null,
      maps_link: link || editing?.maps_link || null,
      latitude: lat, longitude: lng,
      raio_metros: raio > 0 ? raio : 100,
      requer_execucao: fd.get("requer_execucao") === "on",
      ativo: true,
    };

    setBusy(true);
    const { error } = editing
      ? await supabase.from("lojas").update(payload).eq("id", editing.id)
      : await supabase.from("lojas").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Loja atualizada!" : "Loja cadastrada!");
    setOpen(false); load();
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Lojas</h1>
          <p className="text-muted-foreground text-sm">{items.length} cadastrada(s) · raio padrão de 100m para bater ponto</p>
        </div>
        <Button variant="brand" onClick={openNovo}><Plus className="h-4 w-4" /> Nova loja</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">Cidade/UF</th>
              <th className="text-left p-3">Coordenadas</th>
              <th className="text-right p-3">Raio</th>
              <th className="text-left p-3">Execução</th>
              <th className="p-3"></th>
            </tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma loja cadastrada.</td></tr>
              ) : items.map(l => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{l.nome}</td>
                  <td className="p-3">{l.clientes?.nome ?? "—"}</td>
                  <td className="p-3 text-xs">{l.cidade ?? "—"}{l.estado ? `/${l.estado}` : ""}</td>
                  <td className="p-3 text-xs font-mono">
                    {l.latitude && l.longitude
                      ? <a href={`https://www.google.com/maps?q=${l.latitude},${l.longitude}`} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{l.latitude.toFixed(5)}, {l.longitude.toFixed(5)}</a>
                      : <Badge className="bg-destructive text-destructive-foreground">sem coordenadas</Badge>}
                  </td>
                  <td className="p-3 text-right">{l.raio_metros ?? 100}m</td>
                  <td className="p-3 text-xs">{l.requer_execucao ? "Sim" : "Não"}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => openEditar(l)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Editar: ${editing.nome}` : "Nova loja"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Cliente</Label>
              <select name="cliente_id" required defaultValue={editing?.cliente_id ?? ""} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div><Label>Nome da loja</Label><Input name="nome" required defaultValue={editing?.nome ?? ""} /></div>
            <div><Label>Endereço</Label><Input name="endereco" defaultValue={editing?.endereco ?? ""} placeholder="Rua, número, bairro" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cidade</Label><Input name="cidade" defaultValue={editing?.cidade ?? ""} /></div>
              <div><Label>UF</Label><Input name="estado" maxLength={2} defaultValue={editing?.estado ?? ""} placeholder="SP" /></div>
            </div>
            <div>
              <Label>Link do Google Maps da loja</Label>
              <Input name="maps_link" defaultValue={editing?.maps_link ?? ""}
                placeholder="Cole o link compartilhado do Google Maps" required={!editing?.latitude} />
              <p className="text-[11px] text-muted-foreground mt-1">
                {editing?.latitude
                  ? `Atual: ${editing.latitude.toFixed(5)}, ${editing.longitude.toFixed(5)} (cole novo link para atualizar).`
                  : "O sistema extrai as coordenadas automaticamente para limitar o ponto ao raio da loja."}
              </p>
            </div>
            <div>
              <Label>Raio (metros) — promotor só bate ponto dentro do raio</Label>
              <Input name="raio_metros" type="number" min={20} max={1000} defaultValue={editing?.raio_metros ?? 100} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="requer_execucao" defaultChecked={editing?.requer_execucao ?? true} className="h-4 w-4 accent-primary" />
              Esta loja exige execução (fotos / checklist)
            </label>
            <Button type="submit" variant="brand" disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
