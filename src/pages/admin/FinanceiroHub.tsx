import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Wallet, Receipt, Lock, FileText, History } from "lucide-react";
import { FinanceiroDashboard, PagamentosPromotores, FaturasClientes } from "./FinanceiroAdmin";
import { FechamentoAdmin, AuditoriaPage } from "./FechamentoAdmin";
import RelatoriosAdmin from "./RelatoriosAdmin";

export default function FinanceiroHub() {
  const [tab, setTab] = useState("dashboard");
  return (
    <div className="space-y-5 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display font-bold">Financeiro</h1>
        <p className="text-muted-foreground text-sm">Pagamentos, faturas, fechamento e relatórios em um só lugar.</p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="dashboard"><LayoutDashboard className="h-4 w-4 mr-1" /> Resumo</TabsTrigger>
          <TabsTrigger value="pagamentos"><Wallet className="h-4 w-4 mr-1" /> Pagamentos</TabsTrigger>
          <TabsTrigger value="faturas"><Receipt className="h-4 w-4 mr-1" /> Faturas</TabsTrigger>
          <TabsTrigger value="fechamento"><Lock className="h-4 w-4 mr-1" /> Fechamento</TabsTrigger>
          <TabsTrigger value="auditoria"><History className="h-4 w-4 mr-1" /> Auditoria</TabsTrigger>
          <TabsTrigger value="relatorios"><FileText className="h-4 w-4 mr-1" /> Relatórios</TabsTrigger>
        </TabsList>
        <Card className="p-4 mt-4">
          <TabsContent value="dashboard" className="m-0"><FinanceiroDashboard /></TabsContent>
          <TabsContent value="pagamentos" className="m-0"><PagamentosPromotores /></TabsContent>
          <TabsContent value="faturas" className="m-0"><FaturasClientes /></TabsContent>
          <TabsContent value="fechamento" className="m-0"><FechamentoAdmin /></TabsContent>
          <TabsContent value="auditoria" className="m-0"><AuditoriaPage /></TabsContent>
          <TabsContent value="relatorios" className="m-0"><RelatoriosAdmin /></TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}
