import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

interface Step {
  selector: string;       // CSS selector do elemento a destacar
  title: string;
  description: string;
}

const TOURS: Record<string, Step[]> = {
  admin: [
    { selector: 'a[href="/app"]',              title: "Dashboard",       description: "Visão geral em tempo real: promotores, lojas, check-ins do dia, rupturas e financeiro do mês." },
    { selector: 'a[href="/app/mapa"]',         title: "Mapa ao vivo",    description: "Veja onde cada promotor está agora, com check-in/saída e rotas." },
    { selector: 'a[href="/app/escala"]',       title: "Escala",          description: "Programe turnos manualmente: data, horário, loja e promotor." },
    { selector: 'a[href="/app/escala-auto"]',  title: "Gerar escala",    description: "O sistema monta a escala do mês automaticamente respeitando jornada e disponibilidade." },
    { selector: 'a[href="/app/promotores"]',   title: "Promotores",      description: "Cadastro completo: dados, valores de diária, hora extra, PIX e perfil de acesso." },
    { selector: 'a[href="/app/clientes"]',     title: "Clientes",        description: "Empresas contratantes. Aqui você cria também o login de acesso de cada contratante." },
    { selector: 'a[href="/app/lojas"]',        title: "Lojas",           description: "Pontos de venda com geolocalização e raio de check-in. Defina se exigem execução." },
    { selector: 'a[href="/app/produtos"]',     title: "Produtos",        description: "Catálogo por cliente, usado para validades e rupturas." },
    { selector: 'a[href="/app/campanhas"]',    title: "Campanhas",       description: "Vincule promotores e lojas a uma campanha do cliente." },
    { selector: 'a[href="/app/financeiro"]',   title: "Financeiro",      description: "Resumo, pagamentos a promotores, faturas, fechamento mensal, auditoria e relatórios — tudo num só lugar." },
    { selector: 'a[href="/app/monitoramento"]',title: "Monitoramento",   description: "Histórico completo de check-ins com GPS." },
  ],
  contratante: [
    { selector: 'a[href="/app"]',          title: "Painel",       description: "Visão geral das suas lojas: visitas do dia, fotos enviadas e rupturas." },
    { selector: 'a[href="/app/lojas"]',    title: "Suas lojas",   description: "Consulte todas as lojas ativas no seu contrato." },
    { selector: 'a[href="/app/execucoes"]',title: "Execuções",    description: "Auditoria das execuções com fotos, score e observações." },
    { selector: 'a[href="/app/rupturas"]', title: "Validades & Rupturas",description: "Acompanhe produtos com baixo estoque ou validade próxima." },
    { selector: 'a[href="/app/faturas"]',  title: "Faturas",      description: "Suas faturas com detalhamento por turno, promotor e loja." },
    { selector: 'a[href="/app/relatorios"]',title: "Relatórios",  description: "Gere relatórios por loja, promotor ou detalhado, em PDF ou Excel." },
  ],
  promotor: [
    { selector: 'a[href="/app"]',           title: "Início",     description: "Tudo o que importa do seu dia: campanhas ativas, último check-in e atalhos." },
    { selector: 'a[href="/app/agenda"]',    title: "Agenda",     description: "Veja seus turnos programados pelo admin (data, loja e horário)." },
    { selector: 'a[href="/app/checkin"]',   title: "Check-in",   description: "Bata o ponto: foto ao vivo + GPS validam sua presença na loja." },
    { selector: 'a[href="/app/execucao"]',  title: "Execução",   description: "Checklist da loja, fotos do antes/depois, rupturas e validades." },
    { selector: 'a[href="/app/pagamentos"]',title: "Pagamentos", description: "Acompanhe seus turnos, valor a receber e comprovantes de pagamento." },
  ],
};

export function OnboardingTour() {
  const { user, primaryRole, loading } = useAuth();
  const [stepIdx, setStepIdx] = useState(0);
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Decide se inicia
  useEffect(() => {
    if (loading || !user || !primaryRole) return;
    const key = `fni_tour_done_${user.id}_${primaryRole}`;
    if (localStorage.getItem(key) === "1") return;
    // Espera o layout pintar
    const t = setTimeout(() => setActive(true), 800);
    return () => clearTimeout(t);
  }, [user, primaryRole, loading]);

  const steps = primaryRole ? TOURS[primaryRole] ?? [] : [];

  // Mede o elemento atual
  useEffect(() => {
    if (!active || !steps[stepIdx]) return;
    const update = () => {
      const el = document.querySelector(steps[stepIdx].selector) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setTimeout(() => setRect(el.getBoundingClientRect()), 250);
      } else {
        setRect(null);
      }
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, stepIdx, steps]);

  if (!active || steps.length === 0) return null;

  const finish = () => {
    if (user && primaryRole) {
      localStorage.setItem(`fni_tour_done_${user.id}_${primaryRole}`, "1");
    }
    setActive(false);
  };

  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  // Posição do tooltip (logo abaixo ou ao lado do elemento, com fallback central)
  let tipStyle: React.CSSProperties = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  let highlight: React.CSSProperties | null = null;
  if (rect) {
    const pad = 8;
    highlight = {
      top: rect.top - pad, left: rect.left - pad,
      width: rect.width + pad * 2, height: rect.height + pad * 2,
    };
    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop && rect.right < window.innerWidth - 360) {
      // Mostra à direita do item da sidebar
      tipStyle = { top: Math.max(16, rect.top), left: rect.right + 24, transform: "none" };
    } else {
      // Mobile / topbar: mostra abaixo
      tipStyle = { top: rect.bottom + 16, left: 16, right: 16, transform: "none" };
    }
  }

  return (
    <div className="fixed inset-0 z-[9998]" role="dialog" aria-modal="true" aria-label="Tour de boas-vindas">
      {/* Backdrop com recorte */}
      <div className="absolute inset-0 bg-black/70 transition-opacity" onClick={() => { /* impede fechar acidental */ }} />
      {highlight && (
        <div
          className="absolute rounded-xl ring-4 ring-primary shadow-[0_0_0_9999px_hsl(var(--background)/0)] pointer-events-none animate-pulse-ring"
          style={{ ...highlight, boxShadow: "0 0 0 9999px hsl(0 0% 0% / 0.7)" }}
        />
      )}

      {/* Card do passo */}
      <div
        className="absolute max-w-sm w-[min(92vw,360px)] bg-card text-card-foreground rounded-xl shadow-brand border border-primary/40 p-5 animate-fade-in-up"
        style={tipStyle}
      >
        <button onClick={finish} aria-label="Pular tour" className="absolute top-2 right-2 p-1 text-card-foreground/60 hover:text-card-foreground">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 text-primary mb-2">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Passo {stepIdx + 1} de {steps.length}
          </span>
        </div>
        <h3 className="font-display font-bold text-lg mb-1">{step.title}</h3>
        <p className="text-sm text-card-foreground/80 leading-relaxed">{step.description}</p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button size="sm" variant="ghost" onClick={finish} className="text-card-foreground/70">
            Pular
          </Button>
          <div className="flex items-center gap-2">
            {stepIdx > 0 && (
              <Button size="sm" variant="outline" onClick={() => setStepIdx(i => i - 1)}>
                <ChevronLeft className="h-4 w-4" /> Voltar
              </Button>
            )}
            <Button size="sm" variant="brand" onClick={() => isLast ? finish() : setStepIdx(i => i + 1)}>
              {isLast ? "Concluir" : <>Próximo <ChevronRight className="h-4 w-4" /></>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
