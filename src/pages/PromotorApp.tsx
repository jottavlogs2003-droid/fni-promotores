import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MobileAppLayout } from "@/components/layouts/MobileAppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, MapPin, Camera, ListChecks, Calendar, AlertTriangle, ChevronRight, CheckCircle2, Clock, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { LiveCamera } from "@/components/LiveCamera";

const items = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/app/agenda", label: "Agenda", icon: Calendar },
  { to: "/app/checkin", label: "Check-in", icon: MapPin },
  { to: "/app/execucao", label: "Execução", icon: ListChecks },
  { to: "/app/pagamentos", label: "Pagto", icon: Wallet },
];

function PromotorHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ checkInsHoje: 0, lojasAtivas: 0, rupturas: 0, validades: 0 });
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [ultimoCheckIn, setUltimoCheckIn] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [{ data: checkIns }, { data: camps }, { data: rupt }, { data: vals }] = await Promise.all([
        supabase.from("check_ins").select("*, lojas(nome)").eq("promotor_id", user.id).gte("hora_entrada", today.toISOString()).order("hora_entrada", { ascending: false }),
        supabase.from("campanhas").select("*, clientes(nome)").eq("status", "ativa").order("data_inicio", { ascending: false }),
        supabase.from("rupturas").select("id").eq("promotor_id", user.id).eq("status", "aberta"),
        supabase.from("validades").select("id").eq("promotor_id", user.id),
      ]);
      setStats({
        checkInsHoje: checkIns?.length ?? 0,
        lojasAtivas: new Set(checkIns?.map(c => c.loja_id) ?? []).size,
        rupturas: rupt?.length ?? 0,
        validades: vals?.length ?? 0,
      });
      setCampanhas(camps ?? []);
      setUltimoCheckIn(checkIns?.[0] ?? null);
    })();
  }, [user]);

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Hero card */}
      <Card className="p-5 gradient-hero text-white border-0 shadow-lg">
        <p className="text-xs uppercase tracking-wider text-white/70 font-semibold">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
        <h1 className="text-2xl font-display font-bold mt-1">Pronto para a rota?</h1>
        <p className="text-white/80 text-sm mt-1">Bata seu ponto e comece a execução em loja.</p>
        <Button asChild variant="brand" size="lg" className="mt-4 w-full">
          <Link to="/app/checkin"><MapPin className="h-5 w-5" /> Bater ponto agora</Link>
        </Button>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-secondary mb-1"><CheckCircle2 className="h-4 w-4" /><span className="text-xs font-medium">Check-ins hoje</span></div>
          <p className="text-3xl font-bold font-display">{stats.checkInsHoje}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-success mb-1"><MapPin className="h-4 w-4" /><span className="text-xs font-medium">Lojas visitadas</span></div>
          <p className="text-3xl font-bold font-display">{stats.lojasAtivas}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-warning mb-1"><AlertTriangle className="h-4 w-4" /><span className="text-xs font-medium">Rupturas abertas</span></div>
          <p className="text-3xl font-bold font-display">{stats.rupturas}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-primary mb-1"><Calendar className="h-4 w-4" /><span className="text-xs font-medium">Validades</span></div>
          <p className="text-3xl font-bold font-display">{stats.validades}</p>
        </Card>
      </div>

      {ultimoCheckIn && !ultimoCheckIn.hora_saida && (
        <Card className="p-4 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-3">
            <div className="bg-warning text-warning-foreground p-2 rounded-lg"><Clock className="h-5 w-5" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">Check-in em andamento</p>
              <p className="text-xs text-muted-foreground truncate">{ultimoCheckIn.lojas?.nome}</p>
            </div>
            <Button asChild size="sm" variant="outline"><Link to="/app/execucao">Continuar</Link></Button>
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-lg font-display font-bold mb-3">Campanhas ativas</h2>
        {campanhas.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma campanha ativa no momento.</Card>
        ) : (
          <div className="space-y-2">
            {campanhas.slice(0, 5).map(c => (
              <Card key={c.id} className="p-4 flex items-center justify-between hover:shadow-md transition-base">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{c.nome}</p>
                  <p className="text-xs text-muted-foreground">{c.clientes?.nome} · até {new Date(c.data_fim).toLocaleDateString("pt-BR")}</p>
                </div>
                <Badge className="bg-success text-success-foreground">Ativa</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckInPage() {
  const { user } = useAuth();
  const [lojas, setLojas] = useState<any[]>([]);
  const [selectedLoja, setSelectedLoja] = useState<string>("");
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    supabase.from("lojas").select("*").eq("ativo", true).then(({ data }) => setLojas(data ?? []));
  }, [user]);

  function getLocation() {
    setError("");
    navigator.geolocation.getCurrentPosition(
      pos => setPosition(pos),
      err => setError("Não foi possível obter localização: " + err.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function distMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371000;
    const toRad = (d: number) => d * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  }

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !position || !selfie || !selectedLoja) {
      setError("Preencha todos os campos: loja, GPS e selfie."); return;
    }
    const loja = lojas.find(l => l.id === selectedLoja);
    let dist: number | null = null;
    if (loja?.latitude && loja?.longitude) {
      dist = distMeters(position.coords.latitude, position.coords.longitude, loja.latitude, loja.longitude);
      if (dist > (loja.raio_metros ?? 100)) {
        setError(`Você está a ${dist}m da loja. Aproxime-se até ${loja.raio_metros ?? 100}m.`);
        return;
      }
    }
    setBusy(true);
    const { enqueueCheckIn, fileToDataUrl } = await import("@/lib/offlineQueue");
    const tryOnline = async () => {
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("selfies-checkin").upload(path, selfie);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("check_ins").insert({
        promotor_id: user.id, loja_id: selectedLoja,
        latitude_entrada: position.coords.latitude,
        longitude_entrada: position.coords.longitude,
        selfie_url: path,
        distancia_metros: dist,
      });
      if (insErr) throw insErr;
    };
    try {
      if (!navigator.onLine) throw new Error("offline");
      await tryOnline();
      window.location.href = loja?.requer_execucao === false ? "/app" : "/app/execucao";
    } catch (err: any) {
      // Salva offline e segue
      try {
        const dataUrl = await fileToDataUrl(selfie);
        await enqueueCheckIn({
          promotor_id: user.id,
          loja_id: selectedLoja,
          latitude_entrada: position.coords.latitude,
          longitude_entrada: position.coords.longitude,
          distancia_metros: dist,
          selfieDataUrl: dataUrl,
          selfieName: selfie.name || "selfie.jpg",
        });
        setError(null);
        alert("Check-in salvo offline. Será enviado quando a conexão voltar.");
        window.location.href = "/app";
      } catch (e: any) {
        setError(e.message ?? String(err));
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="text-2xl font-display font-bold">Bater ponto</h1>
      <form onSubmit={handleCheckIn} className="space-y-4">
        <Card className="p-4 space-y-3">
          <label className="text-sm font-medium">Loja</label>
          <select value={selectedLoja} onChange={e => setSelectedLoja(e.target.value)} required
            className="w-full h-12 rounded-lg border border-input bg-background px-3 text-sm">
            <option value="">Selecione a loja</option>
            {lojas.map(l => <option key={l.id} value={l.id}>{l.nome} — {l.cidade}</option>)}
          </select>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Localização GPS</span>
            <Button type="button" size="sm" variant="outline" onClick={getLocation}><MapPin className="h-4 w-4" /> Obter</Button>
          </div>
          {position ? (
            <p className="text-xs text-success">✓ {position.coords.latitude.toFixed(5)}, {position.coords.longitude.toFixed(5)} (±{Math.round(position.coords.accuracy)}m)</p>
          ) : <p className="text-xs text-muted-foreground">Aguardando GPS...</p>}
        </Card>

        <Card className="p-4 space-y-3">
          <label className="text-sm font-medium flex items-center gap-2"><Camera className="h-4 w-4" /> Selfie ao vivo</label>
          <p className="text-xs text-muted-foreground">A foto deve ser tirada agora pela câmera. Acesso à galeria está desativado.</p>
          <LiveCamera facing="user" onCapture={f => setSelfie(f)} label="Abrir câmera frontal" />
          {selfie && <p className="text-xs text-success">✓ Foto pronta</p>}
        </Card>

        {error && <Card className="p-3 bg-destructive/10 border-destructive/30 text-destructive text-sm">{error}</Card>}

        <Button type="submit" disabled={busy} variant="brand" size="xl" className="w-full">
          {busy ? "Registrando..." : "Confirmar check-in"}
        </Button>
      </form>
    </div>
  );
}

function ExecucaoPage() {
  const { user } = useAuth();
  const [openCheckIn, setOpenCheckIn] = useState<any>(null);
  const [checklist, setChecklist] = useState({ loja_organizada: false, produto_exposto: false, preco_visivel: false, material_merchandising: false });
  const [obs, setObs] = useState("");
  const [fotosAntes, setFotosAntes] = useState<File[]>([]);
  const [fotosDepois, setFotosDepois] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("check_ins").select("*, lojas(nome, cliente_id, requer_execucao)").eq("promotor_id", user.id).is("hora_saida", null).order("hora_entrada", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setOpenCheckIn(data));
  }, [user]);

  async function uploadFotos(files: File[], tipo: "antes" | "depois", checkInId: string, lojaId: string) {
    for (const f of files) {
      const path = `${user!.id}/${Date.now()}-${tipo}-${f.name}`;
      const { error } = await supabase.storage.from("fotos-execucao").upload(path, f);
      if (error) continue;
      await supabase.from("fotos_execucao").insert({
        check_in_id: checkInId, promotor_id: user!.id, loja_id: lojaId, tipo, foto_url: path,
      });
    }
  }

  const requerExecucao = openCheckIn?.lojas?.requer_execucao !== false;

  async function handleFinalizar() {
    if (!openCheckIn || !user) return;
    setBusy(true);
    try {
      if (requerExecucao) {
        const score = Object.values(checklist).filter(Boolean).length * 25;
        const { error: execErr } = await supabase.from("execucoes").insert({
          check_in_id: openCheckIn.id, promotor_id: user.id, loja_id: openCheckIn.loja_id,
          ...checklist, observacoes: obs, score,
        });
        if (execErr) throw execErr;
        await uploadFotos(fotosAntes, "antes", openCheckIn.id, openCheckIn.loja_id);
        await uploadFotos(fotosDepois, "depois", openCheckIn.id, openCheckIn.loja_id);
      }

      navigator.geolocation.getCurrentPosition(async pos => {
        await supabase.from("check_ins").update({
          hora_saida: new Date().toISOString(),
          latitude_saida: pos.coords.latitude, longitude_saida: pos.coords.longitude,
        }).eq("id", openCheckIn.id);
        window.location.href = "/app";
      }, async () => {
        await supabase.from("check_ins").update({ hora_saida: new Date().toISOString() }).eq("id", openCheckIn.id);
        window.location.href = "/app";
      });
    } finally { setBusy(false); }
  }

  if (!openCheckIn) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <h1 className="text-2xl font-display font-bold">Execução em loja</h1>
        <Card className="p-8 text-center">
          <ListChecks className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Você precisa fazer check-in em uma loja antes de iniciar a execução.</p>
          <Button asChild variant="brand" className="mt-4"><Link to="/app/checkin">Bater ponto</Link></Button>
        </Card>
      </div>
    );
  }

  const items = [
    { key: "loja_organizada", label: "Loja organizada" },
    { key: "produto_exposto", label: "Produto exposto corretamente" },
    { key: "preco_visivel", label: "Preço visível" },
    { key: "material_merchandising", label: "Material de merchandising presente" },
  ] as const;

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-display font-bold">{requerExecucao ? "Execução em loja" : "Encerrar ponto"}</h1>
        <p className="text-sm text-muted-foreground">{openCheckIn.lojas?.nome}</p>
      </div>

      {requerExecucao ? (
        <>
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm">Checklist</h2>
            {items.map(it => (
              <label key={it.key} className="flex items-center gap-3 py-2 cursor-pointer">
                <input type="checkbox" checked={(checklist as any)[it.key]} onChange={e => setChecklist(s => ({ ...s, [it.key]: e.target.checked }))}
                  className="h-5 w-5 rounded border-input accent-primary" />
                <span className="text-sm">{it.label}</span>
              </label>
            ))}
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2"><Camera className="h-4 w-4" /> Foto antes (ao vivo)</h2>
            <LiveCamera facing="environment" onCapture={f => setFotosAntes(s => [...s, f])} label="Tirar foto antes" />
            {fotosAntes.length > 0 && <p className="text-xs text-success">{fotosAntes.length} foto(s) capturada(s)</p>}
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2"><Camera className="h-4 w-4" /> Foto depois (ao vivo)</h2>
            <LiveCamera facing="environment" onCapture={f => setFotosDepois(s => [...s, f])} label="Tirar foto depois" />
            {fotosDepois.length > 0 && <p className="text-xs text-success">{fotosDepois.length} foto(s) capturada(s)</p>}
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-sm">Observações</h2>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={3} maxLength={1000}
              className="w-full rounded-lg border border-input bg-background p-3 text-sm" placeholder="Comentários sobre a execução..." />
          </Card>
        </>
      ) : (
        <Card className="p-5 text-sm text-muted-foreground">
          Esta loja não exige execução de fotos/checklist. Ao finalizar, seu ponto será encerrado.
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="lg"><Link to="/app/ruptura-validade">Ruptura/Validade</Link></Button>
        <Button onClick={handleFinalizar} disabled={busy} variant="brand" size="lg">
          {busy ? "Salvando..." : "Finalizar"}
        </Button>
      </div>
    </div>
  );
}

function RupturaValidadePage() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [openCheckIn, setOpenCheckIn] = useState<any>(null);
  const [tipo, setTipo] = useState<"ruptura" | "validade">("ruptura");
  const [produtoId, setProdutoId] = useState("");
  const [qtd, setQtd] = useState(0);
  const [validade, setValidade] = useState("");
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("check_ins").select("*").eq("promotor_id", user.id).is("hora_saida", null).order("hora_entrada", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setOpenCheckIn(data));
    supabase.from("produtos").select("*").eq("ativo", true).then(({ data }) => setProdutos(data ?? []));
  }, [user]);

  async function handleSave() {
    if (!user || !openCheckIn || !produtoId) return;
    setBusy(true);
    if (tipo === "ruptura") {
      await supabase.from("rupturas").insert({
        produto_id: produtoId, loja_id: openCheckIn.loja_id, promotor_id: user.id,
        quantidade_atual: qtd, observacoes: obs,
      });
    } else {
      await supabase.from("validades").insert({
        produto_id: produtoId, loja_id: openCheckIn.loja_id, promotor_id: user.id,
        data_validade: validade, observacoes: obs,
      });
    }
    setBusy(false);
    setProdutoId(""); setQtd(0); setValidade(""); setObs("");
    alert("Registrado!");
  }

  if (!openCheckIn) return (
    <Card className="p-6 text-center text-sm text-muted-foreground">Faça check-in primeiro.</Card>
  );

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="text-2xl font-display font-bold">Ruptura & Validade</h1>
      <div className="grid grid-cols-2 gap-2">
        <Button variant={tipo === "ruptura" ? "brand" : "outline"} onClick={() => setTipo("ruptura")}>Ruptura</Button>
        <Button variant={tipo === "validade" ? "brand" : "outline"} onClick={() => setTipo("validade")}>Validade</Button>
      </div>
      <Card className="p-4 space-y-3">
        <label className="text-sm font-medium">Produto</label>
        <select value={produtoId} onChange={e => setProdutoId(e.target.value)} className="w-full h-12 rounded-lg border border-input bg-background px-3 text-sm">
          <option value="">Selecione</option>
          {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} {p.sku && `· ${p.sku}`}</option>)}
        </select>
        {tipo === "ruptura" ? (
          <>
            <label className="text-sm font-medium">Quantidade atual</label>
            <input type="number" min={0} value={qtd} onChange={e => setQtd(+e.target.value)}
              className="w-full h-12 rounded-lg border border-input bg-background px-3 text-sm" />
          </>
        ) : (
          <>
            <label className="text-sm font-medium">Data de validade</label>
            <input type="date" value={validade} onChange={e => setValidade(e.target.value)}
              className="w-full h-12 rounded-lg border border-input bg-background px-3 text-sm" />
          </>
        )}
        <label className="text-sm font-medium">Observações</label>
        <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2} maxLength={500}
          className="w-full rounded-lg border border-input bg-background p-3 text-sm" />
      </Card>
      <Button onClick={handleSave} disabled={busy || !produtoId} variant="brand" size="lg" className="w-full">
        {busy ? "Salvando..." : "Registrar"}
      </Button>
    </div>
  );
}

function HistoricoPage() {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("check_ins").select("*, lojas(nome, cidade)").eq("promotor_id", user.id).order("hora_entrada", { ascending: false }).limit(50)
      .then(({ data }) => setCheckIns(data ?? []));
  }, [user]);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="text-2xl font-display font-bold">Histórico</h1>
      {checkIns.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum check-in registrado.</Card>
      ) : checkIns.map(c => (
        <Card key={c.id} className="p-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{c.lojas?.nome}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(c.hora_entrada).toLocaleString("pt-BR")}
              {c.hora_saida && ` · saída ${new Date(c.hora_saida).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
            </p>
          </div>
          <Badge variant={c.hora_saida ? "secondary" : "default"} className={c.hora_saida ? "" : "bg-warning text-warning-foreground"}>
            {c.hora_saida ? "Concluído" : "Em curso"}
          </Badge>
        </Card>
      ))}
    </div>
  );
}

function AgendaPage() {
  const { user } = useAuth();
  const [escalas, setEscalas] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("escalas").select("*, lojas(nome, cidade, endereco)").eq("promotor_id", user.id).gte("data", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)).order("data").then(({ data }) => setEscalas(data ?? []));
  }, [user]);
  const hoje = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="text-2xl font-display font-bold">Minha agenda</h1>
      {escalas.length === 0 ? (
        <Card className="p-8 text-center text-sm text-foreground/60">Nenhum turno agendado.</Card>
      ) : escalas.map(e => (
        <Card key={e.id} className={`p-4 ${e.data === hoje ? "border-primary border-2" : ""}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-foreground/60 font-semibold">
                {new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                {e.data === hoje && <span className="ml-2 text-primary">· HOJE</span>}
              </p>
              <p className="font-bold text-base mt-1">{e.lojas?.nome}</p>
              <p className="text-xs text-foreground/70">{e.lojas?.endereco} — {e.lojas?.cidade}</p>
              <p className="text-sm mt-2 font-semibold">{e.hora_inicio?.slice(0,5)} → {e.hora_fim?.slice(0,5)} <span className="text-foreground/60 font-normal">({e.duracao_horas}h · {Number(e.diarias).toFixed(1)} diária)</span></p>
            </div>
            <Badge className={
              e.status === "concluido" ? "bg-success text-success-foreground" :
              e.status === "em_andamento" ? "bg-warning text-warning-foreground" :
              "bg-secondary text-secondary-foreground"
            }>{e.status}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

function MeusPagamentos() {
  const { user } = useAuth();
  const [pags, setPags] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("pagamentos_promotores").select("*").eq("promotor_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setPags(data ?? []));
  }, [user]);
  const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const total = pags.reduce((s, p) => s + Number(p.valor_total || 0), 0);
  const pendente = pags.filter(p => p.status === "pendente").reduce((s, p) => s + Number(p.valor_total || 0), 0);
  return (
    <div className="space-y-4 animate-fade-in-up">
      <h1 className="text-2xl font-display font-bold">Meus pagamentos</h1>
      <Card className="p-5 gradient-hero text-white border-0">
        <p className="text-xs uppercase text-white/70 font-semibold">A receber</p>
        <p className="text-3xl font-bold mt-1">{BRL(pendente)}</p>
        <p className="text-xs text-white/70 mt-2">Total acumulado: {BRL(total)}</p>
      </Card>
      {pags.length === 0 ? (
        <Card className="p-6 text-center text-sm text-foreground/60">Nenhum pagamento ainda.</Card>
      ) : pags.map(p => (
        <Card key={p.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">{BRL(Number(p.valor_total))}</p>
              <p className="text-xs text-foreground/70">{p.periodo_inicio} → {p.periodo_fim} · {Number(p.total_diarias).toFixed(1)} diárias</p>
              {Number(p.horas_extras) > 0 && <p className="text-xs text-foreground/70">+ {Number(p.horas_extras).toFixed(1)}h extras = {BRL(Number(p.valor_extras))}</p>}
            </div>
            <Badge className={p.status === "pago" ? "bg-success text-success-foreground" : "bg-warning text-warning-foreground"}>{p.status}</Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function PromotorApp() {
  return (
    <MobileAppLayout items={items}>
      <Routes>
        <Route index element={<PromotorHome />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="checkin" element={<CheckInPage />} />
        <Route path="execucao" element={<ExecucaoPage />} />
        <Route path="ruptura-validade" element={<RupturaValidadePage />} />
        <Route path="historico" element={<HistoricoPage />} />
        <Route path="pagamentos" element={<MeusPagamentos />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </MobileAppLayout>
  );
}
