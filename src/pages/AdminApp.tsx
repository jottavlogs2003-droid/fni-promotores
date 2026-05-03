import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DesktopLayout } from "@/components/layouts/DesktopLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Users, Building2, Store, Package, Megaphone, MapPin, FileText, Plus, Loader2, Calendar, DollarSign, Wand2, Map as MapIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FinanceiroDashboard, EscalaAdmin } from "./admin/FinanceiroAdmin";
import GeradorEscala from "./admin/GeradorEscala";
import MapaAoVivo from "./admin/MapaAoVivo";
import FinanceiroHub from "./admin/FinanceiroHub";

const items = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/mapa", label: "Mapa ao vivo", icon: MapIcon },
  { to: "/app/escala", label: "Escala", icon: Calendar },
  { to: "/app/escala-auto", label: "Gerar escala", icon: Wand2 },
  { to: "/app/promotores", label: "Promotores", icon: Users },
  { to: "/app/clientes", label: "Clientes", icon: Building2 },
  { to: "/app/lojas", label: "Lojas", icon: Store },
  { to: "/app/produtos", label: "Produtos", icon: Package },
  { to: "/app/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/app/financeiro", label: "Financeiro", icon: DollarSign },
  { to: "/app/monitoramento", label: "Monitoramento", icon: MapPin },
];

function AdminDashboard() {
  const [stats, setStats] = useState({ promotores: 0, lojas: 0, checkInsHoje: 0, rupturas: 0, validades: 0, campanhas: 0 });
  const [fin, setFin] = useState({ pagar: 0, receber: 0, lucro: 0 });
  const [recentes, setRecentes] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [proms, lojas, ci, rupt, vals, camps, recs, finData] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "promotor"),
        supabase.from("lojas").select("id", { count: "exact", head: true }).eq("ativo", true),
        supabase.from("check_ins").select("id", { count: "exact", head: true }).gte("hora_entrada", today.toISOString()),
        supabase.from("rupturas").select("id", { count: "exact", head: true }).eq("status", "aberta"),
        supabase.from("validades").select("id", { count: "exact", head: true }),
        supabase.from("campanhas").select("id", { count: "exact", head: true }).eq("status", "ativa"),
        supabase.from("check_ins").select("*, lojas(nome), profiles!check_ins_promotor_id_fkey(nome)").order("hora_entrada", { ascending: false }).limit(8),
        supabase.from("resumo_financeiro_mensal").select("*").limit(1).maybeSingle(),
      ]);
      setStats({
        promotores: proms.count ?? 0, lojas: lojas.count ?? 0, checkInsHoje: ci.count ?? 0,
        rupturas: rupt.count ?? 0, validades: vals.count ?? 0, campanhas: camps.count ?? 0,
      });
      const f: any = finData.data ?? {};
      setFin({
        pagar: Number(f.total_pagar_promotores ?? 0),
        receber: Number(f.total_receber_clientes ?? 0),
        lucro: Number(f.lucro ?? 0),
      });
      setRecentes(recs.data ?? []);
    })();
  }, []);

  const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da operação em tempo real.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Promotores" value={stats.promotores} icon={Users} variant="primary" />
        <StatCard label="Lojas ativas" value={stats.lojas} icon={Store} variant="secondary" />
        <StatCard label="Check-ins hoje" value={stats.checkInsHoje} icon={MapPin} variant="success" />
        <StatCard label="Rupturas abertas" value={stats.rupturas} icon={Package} variant="warning" />
        <StatCard label="Validades" value={stats.validades} icon={FileText} variant="primary" />
        <StatCard label="Campanhas ativas" value={stats.campanhas} icon={Megaphone} variant="secondary" />
      </div>

      <Card className="p-5 bg-gradient-to-br from-primary/20 to-secondary/20 border-primary/30">
        <h2 className="font-display font-bold text-lg mb-4">Resumo financeiro do mês</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-foreground/70">A pagar (promotores)</p>
            <p className="text-2xl font-bold text-warning">{BRL(fin.pagar)}</p>
          </div>
          <div>
            <p className="text-xs text-foreground/70">A receber (clientes)</p>
            <p className="text-2xl font-bold text-success">{BRL(fin.receber)}</p>
          </div>
          <div>
            <p className="text-xs text-foreground/70">Lucro estimado</p>
            <p className="text-2xl font-bold">{BRL(fin.lucro)}</p>
          </div>
        </div>
        <Button asChild variant="brand" size="sm" className="mt-4"><Link to="/app/financeiro">Ver detalhes</Link></Button>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">Atividade recente</h2>
          <Button asChild variant="outline" size="sm"><Link to="/app/monitoramento">Ver tudo</Link></Button>
        </div>
        <div className="space-y-2">
          {recentes.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Sem atividades recentes.</p>}
          {recentes.map(r => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{r.profiles?.nome ?? "Promotor"}</p>
                <p className="text-xs text-muted-foreground">{r.lojas?.nome} · {new Date(r.hora_entrada).toLocaleString("pt-BR")}</p>
              </div>
              <Badge className={r.hora_saida ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
                {r.hora_saida ? "Concluído" : "Em loja"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Generic CRUD list
function CrudList({ title, table, columns, formFields, parentField }: {
  title: string; table: string; columns: { key: string; label: string }[];
  formFields: { key: string; label: string; type?: string; required?: boolean; options?: { value: string; label: string }[] }[];
  parentField?: string;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [clientes, setClientes] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    const { data } = await (supabase as any).from(table).select(parentField ? `*, clientes(nome)` : "*").order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
    if (parentField === "cliente_id") supabase.from("clientes").select("id,nome").then(({ data }) => setClientes(data ?? []));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload: any = {};
    formFields.forEach(f => {
      const v = fd.get(f.key);
      if (v !== null && v !== "") {
        payload[f.key] = f.type === "number" ? Number(v) : v;
      }
    });
    const { error } = await (supabase as any).from(table).insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Cadastrado!");
    setOpen(false);
    load();
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">{title}</h1>
          <p className="text-muted-foreground text-sm">{items.length} cadastrado(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="brand"><Plus className="h-4 w-4" /> Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo cadastro</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formFields.map(f => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}</Label>
                  {f.key === "cliente_id" ? (
                    <select name={f.key} required={f.required} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                      <option value="">Selecione</option>
                      {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  ) : f.options ? (
                    <select name={f.key} required={f.required} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <Input name={f.key} type={f.type ?? "text"} required={f.required} />
                  )}
                </div>
              ))}
              <Button type="submit" disabled={busy} variant="brand" className="w-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {columns.map(c => <th key={c.key} className="text-left p-3 font-semibold">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={columns.length} className="p-8 text-center text-muted-foreground">Nada cadastrado ainda.</td></tr>
              ) : items.map(it => (
                <tr key={it.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  {columns.map(c => <td key={c.key} className="p-3">{c.key === "cliente" ? it.clientes?.nome : String(it[c.key] ?? "—")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function MonitoramentoPage() {
  const [checkIns, setCheckIns] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("check_ins").select("*, lojas(nome, cidade), profiles!check_ins_promotor_id_fkey(nome)").order("hora_entrada", { ascending: false }).limit(100)
      .then(({ data }) => setCheckIns(data ?? []));
  }, []);
  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="text-3xl font-display font-bold">Monitoramento</h1>
      <p className="text-muted-foreground text-sm">Últimos {checkIns.length} check-ins registrados</p>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">
            <th className="text-left p-3">Promotor</th><th className="text-left p-3">Loja</th><th className="text-left p-3">Entrada</th><th className="text-left p-3">Saída</th><th className="text-left p-3">GPS</th>
          </tr></thead>
          <tbody>
            {checkIns.map(c => (
              <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                <td className="p-3 font-medium">{c.profiles?.nome}</td>
                <td className="p-3">{c.lojas?.nome}</td>
                <td className="p-3 text-xs">{new Date(c.hora_entrada).toLocaleString("pt-BR")}</td>
                <td className="p-3 text-xs">{c.hora_saida ? new Date(c.hora_saida).toLocaleString("pt-BR") : <Badge className="bg-warning text-warning-foreground">Em loja</Badge>}</td>
                <td className="p-3 text-xs">{c.latitude_entrada?.toFixed(4)}, {c.longitude_entrada?.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// RelatoriosPage movido para ./admin/RelatoriosAdmin

function PromotoresAdmin() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false });
    setProfiles(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function setRole(userId: string, role: "admin" | "contratante" | "promotor") {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) toast.error(error.message); else { toast.success("Perfil atualizado"); load(); }
  }

  async function saveFinanceiro(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      cpf: fd.get("cpf") || null,
      telefone: fd.get("telefone") || null,
      tipo_promotor: fd.get("tipo_promotor") || null,
      jornada_horas: fd.get("jornada_horas") ? Number(fd.get("jornada_horas")) : null,
      permite_dupla_diaria: fd.get("permite_dupla_diaria") === "on",
      valor_diaria: Number(fd.get("valor_diaria") || 0),
      valor_hora_extra: Number(fd.get("valor_hora_extra") || 0),
      forma_pagamento: fd.get("forma_pagamento") || null,
      chave_pix: fd.get("chave_pix") || null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", editing.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Salvo!"); setEditing(null); load(); }
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <h1 className="text-3xl font-display font-bold">Promotores & Usuários</h1>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border">
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Tipo</th>
              <th className="text-right p-3">R$/diária</th>
              <th className="text-left p-3">Pagamento</th>
              <th className="text-left p-3">Perfil</th>
              <th className="p-3"></th>
            </tr></thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-card/40">
                  <td className="p-3 font-medium">{p.nome}</td>
                  <td className="p-3 text-xs">{p.email}</td>
                  <td className="p-3 text-xs">{p.tipo_promotor ?? "—"} · {p.jornada_horas ?? "—"}h</td>
                  <td className="p-3 text-right">{p.valor_diaria ? Number(p.valor_diaria).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</td>
                  <td className="p-3 text-xs">{p.forma_pagamento ?? "—"}</td>
                  <td className="p-3"><Badge>{p.user_roles?.[0]?.role ?? "—"}</Badge></td>
                  <td className="p-3 flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Editar dados</Button>
                    <Button size="sm" variant="ghost" onClick={() => setRole(p.id, "admin")}>A</Button>
                    <Button size="sm" variant="ghost" onClick={() => setRole(p.id, "contratante")}>C</Button>
                    <Button size="sm" variant="ghost" onClick={() => setRole(p.id, "promotor")}>P</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!editing} onOpenChange={v => !v && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar promotor: {editing?.nome}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={saveFinanceiro} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>CPF</Label><Input name="cpf" defaultValue={editing.cpf ?? ""} /></div>
                <div><Label>Telefone</Label><Input name="telefone" defaultValue={editing.telefone ?? ""} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Tipo</Label>
                  <select name="tipo_promotor" defaultValue={editing.tipo_promotor ?? ""} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">—</option><option value="fixo">Fixo</option><option value="rotativo">Rotativo</option>
                  </select>
                </div>
                <div><Label>Jornada (h)</Label>
                  <select name="jornada_horas" defaultValue={editing.jornada_horas ?? ""} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">—</option><option value="6">6h (1 diária)</option><option value="12">12h (2 diárias)</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="permite_dupla_diaria" defaultChecked={editing.permite_dupla_diaria} className="h-4 w-4 accent-primary" />
                Permite dupla diária
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor diária (R$)</Label><Input name="valor_diaria" type="number" step="0.01" defaultValue={editing.valor_diaria ?? 0} /></div>
                <div><Label>Hora extra (R$)</Label><Input name="valor_hora_extra" type="number" step="0.01" defaultValue={editing.valor_hora_extra ?? 0} /></div>
              </div>
              <div><Label>Forma de pagamento</Label>
                <select name="forma_pagamento" defaultValue={editing.forma_pagamento ?? ""} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">—</option><option value="pix">PIX</option><option value="transferencia">Transferência</option><option value="dinheiro">Dinheiro</option>
                </select>
              </div>
              <div><Label>Chave PIX</Label><Input name="chave_pix" defaultValue={editing.chave_pix ?? ""} /></div>
              <Button type="submit" disabled={busy} variant="brand" className="w-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminApp() {
  return (
    <DesktopLayout items={items} title="Painel Admin">
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="promotores" element={<PromotoresAdmin />} />
        <Route path="clientes" element={
          <CrudList title="Clientes" table="clientes" columns={[{ key: "nome", label: "Nome" }, { key: "responsavel", label: "Responsável" }, { key: "tipo_cobranca", label: "Cobrança" }, { key: "valor_diaria_cobrada", label: "R$/diária" }]}
            formFields={[
              { key: "nome", label: "Nome da empresa", required: true },
              { key: "responsavel", label: "Responsável" },
              { key: "cnpj", label: "CNPJ" },
              { key: "email_contato", label: "Email", type: "email" },
              { key: "telefone", label: "Telefone" },
              { key: "tipo_cobranca", label: "Tipo de cobrança", options: [{ value: "diaria", label: "Por diária" }, { value: "hora", label: "Por hora" }, { value: "mensal", label: "Mensal" }] },
              { key: "valor_diaria_cobrada", label: "Valor por diária (R$)", type: "number" },
              { key: "valor_hora_cobrada", label: "Valor por hora (R$)", type: "number" },
              { key: "valor_mensal", label: "Valor mensal (R$)", type: "number" },
            ]} />
        } />
        <Route path="financeiro" element={<FinanceiroHub />} />
        <Route path="escala" element={<EscalaAdmin />} />
        <Route path="escala-auto" element={<GeradorEscala />} />
        <Route path="lojas" element={
          <CrudList title="Lojas" table="lojas" parentField="cliente_id"
            columns={[{ key: "nome", label: "Nome" }, { key: "cliente", label: "Cliente" }, { key: "cidade", label: "Cidade" }, { key: "raio_metros", label: "Raio (m)" }]}
            formFields={[
              { key: "cliente_id", label: "Cliente", required: true },
              { key: "nome", label: "Nome", required: true },
              { key: "endereco", label: "Endereço" },
              { key: "cidade", label: "Cidade" },
              { key: "estado", label: "Estado" },
              { key: "latitude", label: "Latitude", type: "number" },
              { key: "longitude", label: "Longitude", type: "number" },
              { key: "raio_metros", label: "Raio em metros", type: "number" },
            ]} />
        } />
        <Route path="produtos" element={
          <CrudList title="Produtos" table="produtos" parentField="cliente_id"
            columns={[{ key: "nome", label: "Nome" }, { key: "sku", label: "SKU" }, { key: "marca", label: "Marca" }, { key: "cliente", label: "Cliente" }]}
            formFields={[
              { key: "cliente_id", label: "Cliente", required: true },
              { key: "nome", label: "Nome", required: true },
              { key: "sku", label: "SKU" },
              { key: "marca", label: "Marca" },
              { key: "categoria", label: "Categoria" },
            ]} />
        } />
        <Route path="campanhas" element={
          <CrudList title="Campanhas" table="campanhas" parentField="cliente_id"
            columns={[{ key: "nome", label: "Nome" }, { key: "cliente", label: "Cliente" }, { key: "data_inicio", label: "Início" }, { key: "data_fim", label: "Fim" }, { key: "status", label: "Status" }]}
            formFields={[
              { key: "cliente_id", label: "Cliente", required: true },
              { key: "nome", label: "Nome", required: true },
              { key: "descricao", label: "Descrição" },
              { key: "data_inicio", label: "Início", type: "date", required: true },
              { key: "data_fim", label: "Fim", type: "date", required: true },
              { key: "status", label: "Status", options: [{ value: "rascunho", label: "Rascunho" }, { value: "ativa", label: "Ativa" }, { value: "pausada", label: "Pausada" }, { value: "concluida", label: "Concluída" }] },
            ]} />
        } />
        <Route path="monitoramento" element={<MonitoramentoPage />} />
        <Route path="mapa" element={<MapaAoVivo />} />
        <Route path="auditoria" element={<Navigate to="/app/financeiro" replace />} />
        <Route path="relatorios" element={<Navigate to="/app/financeiro" replace />} />
        <Route path="pagamentos" element={<Navigate to="/app/financeiro" replace />} />
        <Route path="faturas" element={<Navigate to="/app/financeiro" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </DesktopLayout>
  );
}
