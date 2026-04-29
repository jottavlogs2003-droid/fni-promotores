import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DesktopLayout } from "@/components/layouts/DesktopLayout";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Store, Camera, Users, AlertTriangle, FileText, Receipt } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const items = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/lojas", label: "Lojas", icon: Store },
  { to: "/app/execucoes", label: "Execuções", icon: Camera },
  { to: "/app/rupturas", label: "Rupturas", icon: AlertTriangle },
  { to: "/app/faturas", label: "Faturas", icon: Receipt },
  { to: "/app/relatorios", label: "Relatórios", icon: FileText },
];

function ContratanteDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ lojas: 0, checkInsHoje: 0, rupturas: 0, fotos: 0 });
  const [recentes, setRecentes] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.cliente_id) return;
    (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data: lojas } = await supabase.from("lojas").select("id").eq("cliente_id", profile.cliente_id);
      const lojaIds = (lojas ?? []).map(l => l.id);
      const [ci, rupt, fts, recs] = await Promise.all([
        lojaIds.length ? supabase.from("check_ins").select("id", { count: "exact", head: true }).in("loja_id", lojaIds).gte("hora_entrada", today.toISOString()) : { count: 0 } as any,
        lojaIds.length ? supabase.from("rupturas").select("id", { count: "exact", head: true }).in("loja_id", lojaIds).eq("status", "aberta") : { count: 0 } as any,
        lojaIds.length ? supabase.from("fotos_execucao").select("id", { count: "exact", head: true }).in("loja_id", lojaIds) : { count: 0 } as any,
        lojaIds.length ? supabase.from("check_ins").select("*, lojas(nome), profiles!check_ins_promotor_id_fkey(nome)").in("loja_id", lojaIds).order("hora_entrada", { ascending: false }).limit(8) : { data: [] } as any,
      ]);
      setStats({ lojas: lojas?.length ?? 0, checkInsHoje: ci.count ?? 0, rupturas: rupt.count ?? 0, fotos: fts.count ?? 0 });
      setRecentes(recs.data ?? []);
    })();
  }, [profile]);

  if (!profile?.cliente_id) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Sua conta ainda não está vinculada a uma empresa contratante. Entre em contato com a FNI.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display font-bold">Painel do Contratante</h1>
        <p className="text-muted-foreground">Visão da execução nas suas lojas.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Suas lojas" value={stats.lojas} icon={Store} variant="primary" />
        <StatCard label="Check-ins hoje" value={stats.checkInsHoje} icon={Users} variant="secondary" />
        <StatCard label="Rupturas" value={stats.rupturas} icon={AlertTriangle} variant="warning" />
        <StatCard label="Fotos enviadas" value={stats.fotos} icon={Camera} variant="success" />
      </div>
      <Card className="p-5">
        <h2 className="font-display font-bold text-lg mb-4">Visitas recentes</h2>
        {recentes.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma visita ainda.</p> : recentes.map(r => (
          <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <p className="text-sm font-medium">{r.profiles?.nome}</p>
              <p className="text-xs text-muted-foreground">{r.lojas?.nome} · {new Date(r.hora_entrada).toLocaleString("pt-BR")}</p>
            </div>
            <Badge className={r.hora_saida ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>
              {r.hora_saida ? "Concluído" : "Em loja"}
            </Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}

function GenericTable({ title, table, columns }: { title: string; table: string; columns: { key: string; label: string }[] }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { (supabase as any).from(table).select("*, lojas(nome), produtos(nome)").order("created_at", { ascending: false }).limit(100).then(({ data }: any) => setItems(data ?? [])); }, [table]);
  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="text-3xl font-display font-bold">{title}</h1>
      <Card>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/50">{columns.map(c => <th key={c.key} className="text-left p-3">{c.label}</th>)}</tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={columns.length} className="p-8 text-center text-muted-foreground">Sem registros.</td></tr> :
              items.map(it => (
                <tr key={it.id} className="border-b border-border hover:bg-muted/30">
                  {columns.map(c => <td key={c.key} className="p-3">
                    {c.key === "loja" ? it.lojas?.nome : c.key === "produto" ? it.produtos?.nome : c.key.includes("data") || c.key.includes("hora") || c.key === "created_at" ? new Date(it[c.key]).toLocaleString("pt-BR") : String(it[c.key] ?? "—")}
                  </td>)}
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export default function ContratanteApp() {
  return (
    <DesktopLayout items={items} title="Contratante">
      <Routes>
        <Route index element={<ContratanteDashboard />} />
        <Route path="lojas" element={<GenericTable title="Suas lojas" table="lojas" columns={[{ key: "nome", label: "Nome" }, { key: "cidade", label: "Cidade" }, { key: "estado", label: "UF" }]} />} />
        <Route path="execucoes" element={<GenericTable title="Execuções" table="execucoes" columns={[{ key: "loja", label: "Loja" }, { key: "score", label: "Score" }, { key: "observacoes", label: "Observações" }, { key: "created_at", label: "Quando" }]} />} />
        <Route path="rupturas" element={<GenericTable title="Rupturas" table="rupturas" columns={[{ key: "produto", label: "Produto" }, { key: "loja", label: "Loja" }, { key: "quantidade_atual", label: "Qtd" }, { key: "status", label: "Status" }, { key: "created_at", label: "Quando" }]} />} />
        <Route path="relatorios" element={
          <div className="space-y-4 animate-fade-in-up">
            <h1 className="text-3xl font-display font-bold">Relatórios</h1>
            <Card className="p-6 text-sm text-muted-foreground">Relatórios consolidados de performance e execução serão entregues na próxima iteração.</Card>
          </div>
        } />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </DesktopLayout>
  );
}
