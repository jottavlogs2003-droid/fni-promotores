import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, KeyRound, Building2 } from "lucide-react";

const BRL = (v: any) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ClientesAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [editingLogin, setEditingLogin] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("clientes").select("*").order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function criarCliente(e: React.FormEvent<HTMLFormElement>) {
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
    };
    const { data: cli, error } = await supabase.from("clientes").insert(payload).select().single();
    if (error) { setBusy(false); toast.error(error.message); return; }

    const loginEmail = String(fd.get("login_email") || "").trim();
    const loginSenha = String(fd.get("login_senha") || "").trim();
    if (loginEmail && loginSenha.length >= 6) {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error: efErr } = await supabase.functions.invoke("create-contratante-user", {
        body: { email: loginEmail, password: loginSenha, nome: payload.responsavel ?? payload.nome, cliente_id: cli.id },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      if (efErr || (data as any)?.error) {
        toast.warning(`Cliente criado, mas falha ao criar login: ${efErr?.message ?? (data as any).error}`);
      } else {
        toast.success("Cliente + login criados!");
      }
    } else {
      toast.success("Cliente cadastrado!");
    }
    setBusy(false);
    setOpenNew(false);
    load();
  }

  async function criarLoginExistente(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingLogin) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("create-contratante-user", {
      body: {
        email: fd.get("email"),
        password: fd.get("password"),
        nome: fd.get("nome"),
        cliente_id: editingLogin.id,
      },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    setBusy(false);
    if (error || (data as any)?.error) { toast.error(error?.message ?? (data as any).error); return; }
    toast.success("Login criado/atualizado!");
    setEditingLogin(null);
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2"><Building2 className="h-7 w-7" /> Clientes</h1>
          <p className="text-muted-foreground text-sm">{items.length} cadastrado(s) · cadastre cliente e login no mesmo passo</p>
        </div>
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          <DialogTrigger asChild><Button variant="brand"><Plus className="h-4 w-4" /> Novo cliente</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
            <form onSubmit={criarCliente} className="space-y-3">
              <div><Label>Nome da empresa *</Label><Input name="nome" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Responsável</Label><Input name="responsavel" /></div>
                <div><Label>CNPJ</Label><Input name="cnpj" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email contato</Label><Input name="email_contato" type="email" /></div>
                <div><Label>Telefone</Label><Input name="telefone" /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Cobrança</Label>
                  <select name="tipo_cobranca" defaultValue="diaria" className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="diaria">Por diária</option><option value="hora">Por hora</option><option value="mensal">Mensal</option>
                  </select>
                </div>
                <div><Label>R$/diária</Label><Input name="valor_diaria_cobrada" type="number" step="0.01" /></div>
                <div><Label>R$/hora</Label><Input name="valor_hora_cobrada" type="number" step="0.01" /></div>
              </div>
              <div><Label>R$/mensal</Label><Input name="valor_mensal" type="number" step="0.01" /></div>

              <div className="border-t border-border pt-3 mt-3">
                <div className="flex items-center gap-2 text-sm font-semibold mb-2 text-primary">
                  <KeyRound className="h-4 w-4" /> Acesso do contratante (opcional)
                </div>
                <p className="text-xs text-muted-foreground mb-2">Preencha para já criar o login que o cliente usará para entrar no sistema.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email de login</Label><Input name="login_email" type="email" placeholder="contratante@empresa.com" /></div>
                  <div><Label>Senha (mín 6)</Label><Input name="login_senha" type="text" minLength={6} placeholder="Fni@2026" /></div>
                </div>
              </div>

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
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="text-left p-3">Nome</th>
              <th className="text-left p-3">Responsável</th>
              <th className="text-left p-3">Cobrança</th>
              <th className="text-right p-3">R$/diária</th>
              <th className="text-left p-3">Contato</th>
              <th className="p-3"></th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Carregando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum cliente.</td></tr>
              ) : items.map(c => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.nome}</td>
                  <td className="p-3 text-xs">{c.responsavel ?? "—"}</td>
                  <td className="p-3 text-xs">{c.tipo_cobranca}</td>
                  <td className="p-3 text-right">{BRL(c.valor_diaria_cobrada)}</td>
                  <td className="p-3 text-xs">{c.email_contato ?? "—"}</td>
                  <td className="p-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setEditingLogin(c)}>
                      <KeyRound className="h-3 w-3" /> Login
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!editingLogin} onOpenChange={v => !v && setEditingLogin(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Login de acesso · {editingLogin?.nome}</DialogTitle></DialogHeader>
          {editingLogin && (
            <form onSubmit={criarLoginExistente} className="space-y-3">
              <p className="text-xs text-muted-foreground">Se o email já existir, a senha será atualizada e o vínculo recriado.</p>
              <div><Label>Nome</Label><Input name="nome" defaultValue={editingLogin.responsavel ?? editingLogin.nome} required /></div>
              <div><Label>Email</Label><Input name="email" type="email" defaultValue={editingLogin.email_contato ?? ""} required /></div>
              <div><Label>Senha</Label><Input name="password" type="text" minLength={6} defaultValue="Fni@2026" required /></div>
              <Button type="submit" disabled={busy} variant="brand" className="w-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Criar/atualizar acesso
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
