import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Mail, KeyRound, User } from "lucide-react";

export default function ConfigAdmin() {
  const { user, profile } = useAuth();
  const [busyEmail, setBusyEmail] = useState(false);
  const [busyPwd, setBusyPwd] = useState(false);
  const [busyNome, setBusyNome] = useState(false);

  async function trocarEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusyEmail(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const { error } = await supabase.auth.updateUser({ email });
    setBusyEmail(false);
    if (error) toast.error(error.message);
    else toast.success("Confirme o novo email pelo link enviado para sua caixa.");
  }

  async function trocarSenha(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nova = String(fd.get("nova") ?? "");
    const confirmar = String(fd.get("confirmar") ?? "");
    if (nova.length < 6) { toast.error("Senha precisa ter ao menos 6 caracteres."); return; }
    if (nova !== confirmar) { toast.error("As senhas não coincidem."); return; }
    setBusyPwd(true);
    const { error } = await supabase.auth.updateUser({ password: nova });
    setBusyPwd(false);
    if (error) toast.error(error.message);
    else { toast.success("Senha alterada!"); (e.target as HTMLFormElement).reset(); }
  }

  async function trocarNome(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    setBusyNome(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("profiles").update({
      nome: String(fd.get("nome") ?? ""),
      telefone: String(fd.get("telefone") ?? "") || null,
    }).eq("id", user.id);
    setBusyNome(false);
    if (error) toast.error(error.message); else toast.success("Perfil atualizado!");
  }

  return (
    <div className="space-y-6 animate-fade-in-up max-w-2xl">
      <div>
        <h1 className="text-3xl font-display font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie sua conta de administrador.</p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-secondary">
          <User className="h-5 w-5" />
          <h2 className="font-display font-bold">Dados do perfil</h2>
        </div>
        <form onSubmit={trocarNome} className="space-y-3">
          <div><Label>Nome</Label><Input name="nome" defaultValue={profile?.nome ?? ""} required /></div>
          <div><Label>Telefone</Label><Input name="telefone" defaultValue={profile?.telefone ?? ""} /></div>
          <Button type="submit" variant="brand" disabled={busyNome}>
            {busyNome && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar perfil
          </Button>
        </form>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-secondary">
          <Mail className="h-5 w-5" />
          <h2 className="font-display font-bold">Trocar email</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Email atual: <strong>{user?.email}</strong>. Após confirmar, um link será enviado para o novo endereço.
        </p>
        <form onSubmit={trocarEmail} className="space-y-3">
          <div><Label>Novo email</Label><Input name="email" type="email" required defaultValue="" /></div>
          <Button type="submit" variant="brand" disabled={busyEmail}>
            {busyEmail && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Atualizar email
          </Button>
        </form>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-secondary">
          <KeyRound className="h-5 w-5" />
          <h2 className="font-display font-bold">Trocar senha</h2>
        </div>
        <form onSubmit={trocarSenha} className="space-y-3">
          <div><Label>Nova senha</Label><Input name="nova" type="password" minLength={6} required /></div>
          <div><Label>Confirmar nova senha</Label><Input name="confirmar" type="password" minLength={6} required /></div>
          <Button type="submit" variant="brand" disabled={busyPwd}>
            {busyPwd && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Alterar senha
          </Button>
        </form>
      </Card>
    </div>
  );
}
