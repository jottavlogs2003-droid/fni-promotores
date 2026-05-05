import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Package } from "lucide-react";

/**
 * Cadastro de produtos disponível somente ao promotor (admin/contratante apenas
 * visualizam validades). O promotor precisa do cliente — escolhe entre os clientes
 * das suas campanhas atribuídas.
 */
export default function ProdutosPromotor() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("produtos")
      .select("*, clientes(nome)")
      .order("created_at", { ascending: false });
    setProdutos(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!user) return;
    load();
    // Clientes acessíveis ao promotor via RLS
    supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome")
      .then(({ data }) => setClientes(data ?? []));
  }, [user]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      cliente_id: String(fd.get("cliente_id") ?? ""),
      nome: String(fd.get("nome") ?? ""),
      sku: String(fd.get("sku") ?? "") || null,
      marca: String(fd.get("marca") ?? "") || null,
      categoria: String(fd.get("categoria") ?? "") || null,
    };
    const { error } = await supabase.from("produtos").insert(payload);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Produto cadastrado!");
    setOpen(false);
    load();
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Produtos</h1>
          <p className="text-sm text-muted-foreground">{produtos.length} cadastrado(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="brand" size="sm"><Plus className="h-4 w-4" /> Novo</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar produto</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>Cliente</Label>
                <select name="cliente_id" required className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Selecione</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div><Label>Nome</Label><Input name="nome" required /></div>
              <div><Label>SKU</Label><Input name="sku" /></div>
              <div><Label>Marca</Label><Input name="marca" /></div>
              <div><Label>Categoria</Label><Input name="categoria" /></div>
              <Button type="submit" variant="brand" disabled={busy} className="w-full">
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Carregando...</Card>
      ) : produtos.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum produto ainda. Cadastre o primeiro!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {produtos.map(p => (
            <Card key={p.id} className="p-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/15 grid place-items-center text-primary shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{p.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {p.clientes?.nome ?? "—"}{p.marca ? ` · ${p.marca}` : ""}{p.sku ? ` · ${p.sku}` : ""}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
