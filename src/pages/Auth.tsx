import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, Mail, Lock, User } from "lucide-react";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(100),
});
const signupSchema = loginSchema.extend({
  nome: z.string().trim().min(2, "Informe seu nome").max(100),
});

export default function Auth() {
  const { user, loading, ready } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("login");
  const [recovery, setRecovery] = useState(false);

  if (!ready || loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (user) return <Navigate to="/app" replace />;

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Bem-vindo!");
    navigate("/app");
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      email: fd.get("email"), password: fd.get("password"), nome: fd.get("nome"),
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { nome: parsed.data.nome },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Conta criada! Você já pode entrar.");
    setTab("login");
  }

  async function handleRecovery(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "");
    if (!z.string().email().safeParse(email).success) { toast.error("E-mail inválido"); return; }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Enviamos um link de recuperação para seu e-mail.");
    setRecovery(false);
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background hero */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8 safe-top safe-bottom">
        <div className="mb-6 animate-fade-in-up">
          <Logo size="xl" className="drop-shadow-2xl" />
        </div>
        <p className="text-white/80 text-sm mb-8 font-medium tracking-wide">SISTEMA OPERACIONAL DE PROMOTORES</p>

        <Card className="w-full max-w-md p-6 shadow-2xl border-0 backdrop-blur-xl bg-card/95 animate-fade-in-up">
          {recovery ? (
            <form onSubmit={handleRecovery} className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold font-display">Recuperar senha</h2>
                <p className="text-sm text-muted-foreground mt-1">Enviaremos um link para seu e-mail.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recovery-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="recovery-email" name="email" type="email" placeholder="seu@email.com" className="pl-10 h-12" required />
                </div>
              </div>
              <Button type="submit" disabled={busy} variant="brand" size="lg" className="w-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Enviar link
              </Button>
              <button type="button" onClick={() => setRecovery(false)} className="text-sm text-muted-foreground hover:text-foreground w-full text-center">
                Voltar ao login
              </button>
            </form>
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="login-email" name="email" type="email" placeholder="seu@email.com" className="pl-10 h-12" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="login-password" name="password" type="password" placeholder="••••••••" className="pl-10 h-12" required />
                    </div>
                  </div>
                  <Button type="submit" disabled={busy} variant="brand" size="lg" className="w-full">
                    {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Entrar
                  </Button>
                  <button type="button" onClick={() => setRecovery(true)} className="text-sm text-secondary hover:underline w-full text-center">
                    Esqueci minha senha
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-nome">Nome completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-nome" name="nome" type="text" placeholder="Seu nome" className="pl-10 h-12" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" name="email" type="email" placeholder="seu@email.com" className="pl-10 h-12" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" name="password" type="password" placeholder="Mínimo 6 caracteres" className="pl-10 h-12" required minLength={6} />
                    </div>
                  </div>
                  <Button type="submit" disabled={busy} variant="brand" size="lg" className="w-full">
                    {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Criar conta
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Novas contas iniciam como Promotor. Um administrador pode alterar seu perfil.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </Card>

        <p className="text-white/50 text-xs mt-6">© FNI Promotores · Sistema interno</p>
      </div>
    </div>
  );
}
