import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Store } from "lucide-react";
import ClientesAdmin from "./ClientesAdmin";
import LojasAdmin from "./LojasAdmin";

/**
 * Página unificada: Clientes & Lojas em abas (substitui as duas páginas separadas).
 */
export default function ClientesLojasAdmin() {
  const [tab, setTab] = useState("clientes");
  return (
    <div className="space-y-4 animate-fade-in-up">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="clientes"><Building2 className="h-4 w-4 mr-1" /> Clientes</TabsTrigger>
          <TabsTrigger value="lojas"><Store className="h-4 w-4 mr-1" /> Lojas</TabsTrigger>
        </TabsList>
        <TabsContent value="clientes" className="mt-4"><ClientesAdmin /></TabsContent>
        <TabsContent value="lojas" className="mt-4"><LojasAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}
