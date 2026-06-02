import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2, CalendarRange, Wand2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const PERIODOS = {
  manha: { label: "Manhã", inicio: "08:00", fim: "14:00" },
  tarde: { label: "Tarde", inicio: "14:00", fim: "20:00" },
};

type Promotor = {
  id: string;
  nome: string;
  tipo_promotor: string | null;          // "fixo" | "rotativo" | null
  permite_dupla_diaria: boolean | null;
  loja_fixa_id: string | null;
};
type Loja = { id: string; nome: string; cliente_id: string };

type PreviewItem = {
  data: string;
  promotor_id: string;
  promotor_nome: string;
  loja_id: string;
  loja_nome: string;
  periodo: "manha" | "tarde";
  hora_inicio: string;
  hora_fim: string;
  turno: number;
};

function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0) continue; // pula domingo por padrão
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default function GeradorEscala() {
  const hoje = new Date().toISOString().slice(0, 10);
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFim, setDataFim] = useState(hoje);
  const [incluirSabado, setIncluirSabado] = useState(true);
  const [incluirDomingo, setIncluirDomingo] = useState(false);
  const [aplicarDuplaDiaria, setAplicarDuplaDiaria] = useState(true);
  const [clienteId, setClienteId] = useState<string>("todos");
  const [promotoresSelecionados, setPromotoresSelecionados] = useState<Set<string>>(new Set());

  const [promotores, setPromotores] = useState<Promotor[]>([]);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [conflitos, setConflitos] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: profs }, { data: lj }, { data: cls }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,nome,tipo_promotor,permite_dupla_diaria,loja_fixa_id,ativo")
          .eq("ativo", true),
        supabase.from("lojas").select("id,nome,cliente_id").eq("ativo", true),
        supabase.from("clientes").select("id,nome").eq("ativo", true),
      ]);
      // só promotores (não admins/contratantes)
      const ids = (profs ?? []).map((p: any) => p.id);
      let onlyProm: any[] = [];
      if (ids.length) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "promotor")
          .in("user_id", ids);
        const setIds = new Set((roles ?? []).map((r: any) => r.user_id));
        onlyProm = (profs ?? []).filter((p: any) => setIds.has(p.id));
      }
      setPromotores(onlyProm as Promotor[]);
      setPromotoresSelecionados(new Set(onlyProm.map((p: any) => p.id)));
      setLojas((lj ?? []) as Loja[]);
      setClientes((cls ?? []) as any[]);
    })();
  }, []);

  const promotoresAtivos = useMemo(
    () => promotores.filter(p => promotoresSelecionados.has(p.id)),
    [promotores, promotoresSelecionados]
  );

  const lojasFiltradas = useMemo(
    () => (clienteId === "todos" ? lojas : lojas.filter(l => l.cliente_id === clienteId)),
    [lojas, clienteId]
  );

  function diasSelecionados(): string[] {
    const all = daysBetween(dataInicio, dataFim);
    return all.filter(d => {
      const dow = new Date(d + "T00:00:00").getDay();
      if (dow === 0) return incluirDomingo;
      if (dow === 6) return incluirSabado;
      return true;
    });
  }

  async function gerarPreview() {
    setLoading(true);
    setConflitos([]);
    try {
      const dias = diasSelecionados();
      if (dias.length === 0) {
        toast.error("Nenhum dia selecionado no período.");
        return;
      }
      if (lojasFiltradas.length === 0) {
        toast.error("Nenhuma loja disponível para o cliente selecionado.");
        return;
      }
      if (promotoresAtivos.length === 0) {
        toast.error("Selecione pelo menos um promotor.");
        return;
      }

      // Carrega escalas existentes no período para evitar duplicatas
      const { data: existentes } = await supabase
        .from("escalas")
        .select("data,promotor_id,loja_id,turno")
        .gte("data", dataInicio)
        .lte("data", dataFim);
      const ocupado = new Set(
        (existentes ?? []).map((e: any) => `${e.data}|${e.promotor_id}|${e.turno}`)
      );

      const fixos = promotoresAtivos.filter(p => p.tipo_promotor === "fixo" && p.loja_fixa_id);
      const rotativos = promotoresAtivos.filter(p => p.tipo_promotor !== "fixo");

      const itens: PreviewItem[] = [];
      const avisos: string[] = [];
      // Round-robin de lojas para rotativos
      let rrIdx = 0;
      const lojasRR = lojasFiltradas;

      for (const dia of dias) {
        // Fixos: vão para sua loja_fixa_id
        for (const p of fixos) {
          const loja = lojas.find(l => l.id === p.loja_fixa_id);
          if (!loja) {
            avisos.push(`${p.nome}: loja fixa não encontrada (${dia})`);
            continue;
          }
          if (clienteId !== "todos" && loja.cliente_id !== clienteId) continue;

          const turnos: Array<{ k: "manha" | "tarde"; turno: number }> = [{ k: "manha", turno: 1 }];
          if (aplicarDuplaDiaria && p.permite_dupla_diaria) {
            turnos.push({ k: "tarde", turno: 2 });
          }
          for (const t of turnos) {
            const key = `${dia}|${p.id}|${t.turno}`;
            if (ocupado.has(key)) {
              avisos.push(`${p.nome} já tem turno ${t.turno} em ${dia}`);
              continue;
            }
            ocupado.add(key);
            itens.push({
              data: dia,
              promotor_id: p.id,
              promotor_nome: p.nome,
              loja_id: loja.id,
              loja_nome: loja.nome,
              periodo: t.k,
              hora_inicio: PERIODOS[t.k].inicio,
              hora_fim: PERIODOS[t.k].fim,
              turno: t.turno,
            });
          }
        }

        // Rotativos: distribui em round-robin pelas lojas filtradas
        for (const p of rotativos) {
          const turnos: Array<{ k: "manha" | "tarde"; turno: number }> = [{ k: "manha", turno: 1 }];
          if (aplicarDuplaDiaria && p.permite_dupla_diaria) {
            turnos.push({ k: "tarde", turno: 2 });
          }
          for (const t of turnos) {
            const loja = lojasRR[rrIdx % lojasRR.length];
            rrIdx++;
            const key = `${dia}|${p.id}|${t.turno}`;
            if (ocupado.has(key)) {
              avisos.push(`${p.nome} já tem turno ${t.turno} em ${dia}`);
              continue;
            }
            ocupado.add(key);
            itens.push({
              data: dia,
              promotor_id: p.id,
              promotor_nome: p.nome,
              loja_id: loja.id,
              loja_nome: loja.nome,
              periodo: t.k,
              hora_inicio: PERIODOS[t.k].inicio,
              hora_fim: PERIODOS[t.k].fim,
              turno: t.turno,
            });
          }
        }
      }

      setPreview(itens);
      setConflitos(avisos);
      toast.success(`${itens.length} turnos gerados na pré-visualização.`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar pré-visualização.");
    } finally {
      setLoading(false);
    }
  }

  async function aplicarEscala() {
    if (preview.length === 0) {
      toast.error("Gere uma pré-visualização primeiro.");
      return;
    }
    setSalvando(true);
    try {
      const rows = preview.map(p => ({
        data: p.data,
        promotor_id: p.promotor_id,
        loja_id: p.loja_id,
        hora_inicio: p.hora_inicio,
        hora_fim: p.hora_fim,
        duracao_horas: 6,
        turno: p.turno,
        diarias: 1,
        status: "agendado",
      }));
      // Insere em chunks para evitar payload gigante
      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const slice = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from("escalas").insert(slice);
        if (error) throw error;
      }
      toast.success(`Escala aplicada: ${rows.length} turnos criados.`);
      setPreview([]);
      setConflitos([]);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar escala (verifique se o mês não está fechado).");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2">
          <Wand2 className="h-7 w-7 text-primary" /> Gerador automático de escala
        </h1>
        <p className="text-muted-foreground">
          Distribui promotores fixos nas lojas atribuídas e rotativos em round-robin, respeitando dupla diária.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <Label>Início</Label>
            <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
          </div>
          <div>
            <Label>Fim</Label>
            <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </div>
          <div>
            <Label>Cliente</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={clienteId}
              onChange={e => setClienteId(e.target.value)}
            >
              <option value="todos">Todos os clientes</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={incluirSabado} onCheckedChange={v => setIncluirSabado(!!v)} /> Incluir sábado
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={incluirDomingo} onCheckedChange={v => setIncluirDomingo(!!v)} /> Incluir domingo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={aplicarDuplaDiaria} onCheckedChange={v => setAplicarDuplaDiaria(!!v)} /> Dupla diária quando permitido
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Promotores ({promotoresAtivos.length} de {promotores.length})</Label>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => setPromotoresSelecionados(new Set(promotores.map(p => p.id)))} className="text-primary hover:underline">Todos</button>
              <button type="button" onClick={() => setPromotoresSelecionados(new Set())} className="text-muted-foreground hover:underline">Nenhum</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border border-border rounded-md">
            {promotores.map(p => {
              const checked = promotoresSelecionados.has(p.id);
              return (
                <label key={p.id} className={`flex items-center gap-2 text-sm p-2 rounded cursor-pointer transition-base ${checked ? "bg-primary/10" : "hover:bg-muted/40"}`}>
                  <Checkbox checked={checked} onCheckedChange={v => {
                    const next = new Set(promotoresSelecionados);
                    if (v) next.add(p.id); else next.delete(p.id);
                    setPromotoresSelecionados(next);
                  }} />
                  <span className="truncate">{p.nome}</span>
                </label>
              );
            })}
            {promotores.length === 0 && <p className="text-xs text-muted-foreground col-span-full text-center py-4">Nenhum promotor ativo encontrado.</p>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button onClick={gerarPreview} disabled={loading} variant="brand">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar pré-visualização
          </Button>
          <Button onClick={aplicarEscala} disabled={salvando || preview.length === 0} variant="success">
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Aplicar escala ({preview.length})
          </Button>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            {diasSelecionados().length} dias · {promotoresAtivos.length} promotores · {lojasFiltradas.length} lojas
          </div>
        </div>
      </Card>

      {conflitos.length > 0 && (
        <Card className="p-4 border-warning/40 bg-warning/10">
          <div className="flex items-center gap-2 mb-2 font-semibold text-warning-foreground">
            <AlertTriangle className="h-4 w-4" /> Avisos ({conflitos.length})
          </div>
          <ul className="text-xs space-y-1 max-h-32 overflow-auto">
            {conflitos.slice(0, 50).map((c, i) => <li key={i}>• {c}</li>)}
            {conflitos.length > 50 && <li className="opacity-60">… e mais {conflitos.length - 50}</li>}
          </ul>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-display font-bold text-lg mb-3">Pré-visualização</h2>
        {preview.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Configure o período e clique em "Gerar pré-visualização".
          </p>
        ) : (
          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b border-border">
                  <th className="text-left p-2">Data</th>
                  <th className="text-left p-2">Promotor</th>
                  <th className="text-left p-2">Loja</th>
                  <th className="text-left p-2">Período</th>
                  <th className="text-left p-2">Horário</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 500).map((p, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="p-2">{new Date(p.data + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                    <td className="p-2 font-medium">{p.promotor_nome}</td>
                    <td className="p-2">{p.loja_nome}</td>
                    <td className="p-2">
                      <Badge variant="outline">{PERIODOS[p.periodo].label}</Badge>
                    </td>
                    <td className="p-2 text-muted-foreground">{p.hora_inicio} – {p.hora_fim}</td>
                  </tr>
                ))}
                {preview.length > 500 && (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-xs text-muted-foreground">
                      Mostrando 500 de {preview.length} turnos. Todos serão criados ao aplicar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
