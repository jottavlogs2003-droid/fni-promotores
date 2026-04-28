import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // The supabase client auto-handles the recovery hash and emits a session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) setReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    if (password.length < 6) { toast.error("Mínimo 6 caracteres"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha atualizada!");
    navigate("/");
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 gradient-hero">
      <Card className="w-full max-w-md p-6">
        <div className="flex justify-center mb-6"><Logo size="lg" /></div>
        <h1 className="text-2xl font-bold font-display mb-2">Nova senha</h1>
        <p className="text-sm text-muted-foreground mb-6">Defina uma nova senha de acesso.</p>
        {ready ? (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" minLength={6} required className="h-12" />
            </div>
            <Button type="submit" disabled={busy} variant="brand" size="lg" className="w-full">
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Atualizar senha
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Validando link...</p>
        )}
      </Card>
    </div>
  );
}
