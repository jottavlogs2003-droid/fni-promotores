import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import PromotorApp from "./PromotorApp";
import AdminApp from "./AdminApp";
import ContratanteApp from "./ContratanteApp";
import { Logo } from "@/components/Logo";

const Index = () => {
  const { user, primaryRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center gradient-hero">
        <div className="flex flex-col items-center gap-4">
          <Logo size="lg" className="drop-shadow-2xl" />
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (primaryRole === "admin") return <AdminApp />;
  if (primaryRole === "contratante") return <ContratanteApp />;
  if (primaryRole === "promotor") return <PromotorApp />;

  return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <Logo size="lg" className="mx-auto mb-4" />
        <h1 className="text-xl font-display font-bold mb-2">Sem perfil atribuído</h1>
        <p className="text-sm text-muted-foreground">Aguarde um administrador atribuir seu perfil.</p>
      </div>
    </div>
  );
};

export default Index;
