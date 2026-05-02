import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Não mostra dentro de iframe (preview Lovable)
    try { if (window.self !== window.top) return; } catch { return; }
    if (localStorage.getItem("fni_install_dismissed") === "1") { setHidden(true); return; }
    const handler = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!evt || hidden) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 md:left-auto md:right-4 md:w-80 z-50 rounded-xl bg-card border border-primary/30 shadow-brand p-4 animate-fade-in-up">
      <button
        onClick={() => { setHidden(true); localStorage.setItem("fni_install_dismissed", "1"); }}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Instalar app FNI</p>
          <p className="text-xs text-muted-foreground mb-2">Acesso rápido na tela inicial, funciona em tela cheia.</p>
          <Button
            size="sm"
            variant="brand"
            onClick={async () => {
              await evt.prompt();
              const res = await evt.userChoice;
              if (res.outcome) { setHidden(true); localStorage.setItem("fni_install_dismissed", "1"); }
            }}
          >
            Instalar agora
          </Button>
        </div>
      </div>
    </div>
  );
}
