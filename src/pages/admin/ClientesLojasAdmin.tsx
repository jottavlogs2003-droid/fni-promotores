import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Building2, Store, Pencil, Trash2, MapPin, KeyRound, X } from "lucide-react";
import { toast } from "sonner";

const BRL = (v: any) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function parseLatLng(input: string): { lat: number; lng: number } | null {
  if (!input) return null;
  const s = input.trim();
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

type Cliente = any;

/**
 * Cadastro UNIFICADO de clientes + lojas/marcas.
 * Cada cliente é um cartão único; suas lojas (quando tipo=loja) ou marcas
 * (quando tipo=marca) são gerenciadas dentro do mesmo diálogo.
 */
export default function ClientesLojasAdmin() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [lojasPorCliente, setLojasPorCliente] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [openNovo, setOpenNovo] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: cs }, { data: ls }] = await Promise.all([
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("lojas").select("*").eq("ativo", true).order("nome"),
    ]);
    setClientes(cs ?? []);
    const map: Record<string, any[]> = {};
    (ls ?? []).forEach((l: any) => { (map[l.cliente_id] ??= []).push(l); });
    setLojasPorCliente(map);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7" /> Clientes
          </h1>
          <p className="text-muted-foreground text-sm">
            {clientes.length} cadastrado(s) · cada cliente pode ser atendido <b>por loja</b> ou <b>por marca</b>.
          </p>
        </div>
        <Button variant="brand" onClick={() => setOpenNovo(true)}><Plus className="h-4 w-4" /> Novo cliente</Button>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Carregando…</Card>
      ) : clientes.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum cliente cadastrado.</Card>
      ) : (
        <div className="grid gap-3">
          {clientes.map(c => {
            const lojas = lojasPorCliente[c.id] ?? [];
            const isMarca = c.tipo_atendimento === "marca";
            return (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-lg">{c.nome}</h3>
                      <Badge className={isMarca ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}>
                        {isMarca ? "Por marca" : "Por loja"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{c.tipo_cobranca}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.responsavel ?? "—"} · {c.email_contato ?? "sem email"} · diária {BRL(c.valor_diaria_cobrada)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {isMarca ? (
                        (c.marcas ?? []).length === 0
                          ? <span className="text-[11px] text-muted-foreground">Nenhuma marca cadastrada</span>
                          : (c.marcas ?? []).map((m: string) =>
                              <Badge key={m} variant="outline" className="text-[10px]">{m}</Badge>)
                      ) : (
                        lojas.length === 0
                          ? <span className="text-[11px] text-muted-foreground">Nenhuma loja cadastrada</span>
                          : lojas.slice(0, 6).map(l =>
                              <Badge key={l.id} variant="outline" className="text-[10px]">
                                <Store className="h-2.5 w-2.5 mr-0.5" />{l.nome}{l.cidade ? ` · ${l.cidade}` : ""}
                              </Badge>)
                      )}
                      {!isMarca && lojas.length > 6 && <Badge variant="outline" className="text-[10px]">+{lojas.length - 6}</Badge>}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditing(c)}>
                    <Pencil className="h-3.5 w-3.5" /> Gerenciar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ClienteFormDialog open={openNovo} onOpenChange={setOpenNovo} cliente={null} onSaved={load} />
      <ClienteFormDialog open={!!editing} onOpenChange={v => !v && setEditing(null)} cliente={editing} onSaved={load} />
    </div>
  );
}

/* ============================================================ */
/* Diálogo unificado de cliente: dados + login + lojas/marcas    */
/* ============================================================ */
function ClienteFormDialog({ open, onOpenChange, cliente, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; cliente: Cliente | null; onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [tipo, setTipo] = useState<"loja" | "marca">("loja");
  const [marcas, setMarcas] = useState<string[]>([]);
  const [marcaInput, setMarcaInput] = useState("");
  const [lojas, setLojas] = useState<any[]>([]);
  const [criado, setCriado] = useState<Cliente | null>(null);

  useEffect(() => {
    if (open) {
      setTipo(cliente?.tipo_atendimento ?? "loja");
      setMarcas(cliente?.marcas ?? []);
      setMarcaInput("");
      setCriado(cliente);
      if (cliente?.id) {
        supabase.from("lojas").select("*").eq("cliente_id", cliente.id).order("nome")
          .then(({ data }) => setLojas(data ?? []));
      } else setLojas([]);
    }
  }, [open, cliente]);

  const target = criado ?? cliente;

  async function salvarCliente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      nome: fd.get("nome"),
      responsavel: fd.get("responsavel") || null,
      cnpj: fd.get("cnpj") || null,
      email_contato: fd.get("email_contato") || null,
      telefone: fd.get("telefone") || null,
      tipo_cobranca: fd.get("tipo_cobranca") || "diaria",
      valor_diaria_cobrada: Number(fd.get("valor_diaria_cobrada") || 0),
      valor_hora_cobrada: Number(fd.get("valor_hora_cobrada") || 0),
      valor_mensal: Number(fd.get("valor_mensal") || 0),
      tipo_atendimento: tipo,
      marcas: tipo === "marca" ? marcas : [],
    };

    let salvo: Cliente | null = target;
    if (target?.id) {
      const { error } = await supabase.from("clientes").update(payload).eq("id", target.id);
      if (error) { setBusy(false); toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.from("clientes").insert(payload).select().single();
      if (error) { setBusy(false); toast.error(error.message); return; }
      salvo = data;
      // opcional: criar login
      const loginEmail = String(fd.get("login_email") || "").trim();
      const loginSenha = String(fd.get("login_senha") || "").trim();
      if (loginEmail && loginSenha.length >= 6) {
        const { data: { session } } = await supabase.auth.getSession();
        const { error: efErr } = await supabase.functions.invoke("create-contratante-user", {
          body: { email: loginEmail, password: loginSenha, nome: payload.responsavel ?? payload.nome, cliente_id: salvo!.id },
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        if (efErr) toast.warning("Cliente criado, login falhou: " + efErr.message);
      }
    }
    setCriado(salvo);
    setBusy(false);
    toast.success("Cliente salvo!");
    onSaved();
  }

  function addMarca() {
    const m = marcaInput.trim();
    if (!m || marcas.includes(m)) return;
    setMarcas([...marcas, m]); setMarcaInput("");
  }

  async function addLoja(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target?.id) { toast.error("Salve o cliente antes de adicionar lojas."); return; }
    const fd = new FormData(e.currentTarget);
    const link = String(fd.get("maps_link") ?? "").trim();
    const coords = parseLatLng(link);
    if (!coords) { toast.error("Cole um link do Google Maps válido."); return; }
    setBusy(true);
    const { error } = await supabase.from("lojas").insert({
      cliente_id: target.id,
      nome: fd.get("nome"),
      endereco: fd.get("endereco") || null,
      cidade: fd.get("cidade") || null,
      estado: fd.get("estado") || null,
      maps_link: link,
      latitude: coords.lat, longitude: coords.lng,
      raio_metros: Number(fd.get("raio_metros") || 100),
      requer_execucao: true, ativo: true,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Loja adicionada!");
    (e.currentTarget as HTMLFormElement).reset();
    const { data } = await supabase.from("lojas").select("*").eq("cliente_id", target.id).order("nome");
    setLojas(data ?? []);
    onSaved();
  }

  async function removerLoja(id: string) {
    if (!confirm("Inativar esta loja?")) return;
    await supabase.from("lojas").update({ ativo: false }).eq("id", id);
    setLojas(lojas.filter(l => l.id !== id));
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{target ? `Cliente: ${target.nome}` : "Novo cliente"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={salvarCliente} className="space-y-3 border-b border-border pb-4">
          <div><Label>Nome da empresa *</Label><Input name="nome" required defaultValue={target?.nome ?? ""} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Responsável</Label><Input name="responsavel" defaultValue={target?.responsavel ?? ""} /></div>
            <div><Label>CNPJ</Label><Input name="cnpj" defaultValue={target?.cnpj ?? ""} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email contato</Label><Input name="email_contato" type="email" defaultValue={target?.email_contato ?? ""} /></div>
            <div><Label>Telefone</Label><Input name="telefone" defaultValue={target?.telefone ?? ""} /></div>
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
            <Label className="text-sm font-semibold">Tipo de atendimento *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setTipo("loja")}
                className={`p-3 rounded-md border text-left text-sm transition ${tipo === "loja" ? "border-primary bg-primary/15" : "border-input hover:bg-muted/40"}`}>
                <Store className="h-4 w-4 mb-1" /><b>Por loja</b>
                <p className="text-[11px] text-muted-foreground">Promotores são alocados em lojas específicas deste cliente.</p>
              </button>
              <button type="button" onClick={() => setTipo("marca")}
                className={`p-3 rounded-md border text-left text-sm transition ${tipo === "marca" ? "border-primary bg-primary/15" : "border-input hover:bg-muted/40"}`}>
                <KeyRound className="h-4 w-4 mb-1" /><b>Por marca</b>
                <p className="text-[11px] text-muted-foreground">Promotores atendem marcas específicas em várias lojas.</p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div><Label>Cobrança</Label>
              <select name="tipo_cobranca" defaultValue={target?.tipo_cobranca ?? "diaria"} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="diaria">Diária</option><option value="hora">Hora</option><option value="mensal">Mensal</option>
              </select>
            </div>
            <div><Label>R$/diária</Label><Input name="valor_diaria_cobrada" type="number" step="0.01" defaultValue={target?.valor_diaria_cobrada ?? 0} /></div>
            <div><Label>R$/hora</Label><Input name="valor_hora_cobrada" type="number" step="0.01" defaultValue={target?.valor_hora_cobrada ?? 0} /></div>
          </div>
          <div><Label>R$/mensal</Label><Input name="valor_mensal" type="number" step="0.01" defaultValue={target?.valor_mensal ?? 0} /></div>

          {!target && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-2"><KeyRound className="h-3 w-3 inline mr-1" /> Acesso do contratante (opcional)</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email login</Label><Input name="login_email" type="email" /></div>
                <div><Label>Senha (mín 6)</Label><Input name="login_senha" type="text" minLength={6} /></div>
              </div>
            </div>
          )}

          <Button type="submit" variant="brand" disabled={busy} className="w-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar dados do cliente
          </Button>
        </form>

        {/* Marcas */}
        {tipo === "marca" && (
          <div className="space-y-2 pb-4 border-b border-border">
            <Label className="text-sm font-semibold">Marcas atendidas</Label>
            <div className="flex flex-wrap gap-1">
              {marcas.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma marca ainda.</span>}
              {marcas.map(m => (
                <Badge key={m} variant="outline" className="gap-1">
                  {m}
                  <button type="button" onClick={() => setMarcas(marcas.filter(x => x !== m))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={marcaInput} onChange={e => setMarcaInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addMarca(); } }}
                placeholder="Nome da marca + Enter" />
              <Button type="button" variant="outline" onClick={addMarca}>Adicionar</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Lembre de clicar em "Salvar dados do cliente" para persistir.</p>
          </div>
        )}

        {/* Lojas */}
        {tipo === "loja" && target?.id && (
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Lojas deste cliente ({lojas.length})</Label>
            {lojas.length === 0 && <p className="text-xs text-muted-foreground">Adicione a primeira loja abaixo.</p>}
            <div className="space-y-1.5">
              {lojas.map(l => (
                <div key={l.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 text-xs">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{l.nome}</p>
                    <p className="text-muted-foreground truncate">
                      {l.endereco ?? ""} {l.cidade ? `· ${l.cidade}/${l.estado ?? ""}` : ""} · {l.raio_metros}m
                    </p>
                  </div>
                  {l.latitude && <a href={`https://www.google.com/maps?q=${l.latitude},${l.longitude}`} target="_blank" rel="noreferrer" className="text-primary"><MapPin className="h-3 w-3" /></a>}
                  <button onClick={() => removerLoja(l.id)} className="text-destructive p-1"><Trash2 className="h-3 w-3" /></button>
                </div>
              ))}
            </div>

            <form onSubmit={addLoja} className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-xs font-semibold">Adicionar loja</p>
              <div className="grid grid-cols-2 gap-2">
                <Input name="nome" placeholder="Nome da loja" required />
                <Input name="endereco" placeholder="Endereço" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Input name="cidade" placeholder="Cidade" />
                <Input name="estado" maxLength={2} placeholder="UF" />
                <Input name="raio_metros" type="number" defaultValue={100} placeholder="Raio (m)" />
              </div>
              <Input name="maps_link" placeholder="Link do Google Maps (extrai coordenadas)" required />
              <Button type="submit" variant="outline" disabled={busy} size="sm" className="w-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} <Plus className="h-3.5 w-3.5" /> Adicionar loja
              </Button>
            </form>
          </div>
        )}

        {tipo === "loja" && !target?.id && (
          <p className="text-xs text-muted-foreground italic">Salve o cliente para começar a cadastrar as lojas.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
