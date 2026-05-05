import { useEffect, useState } from "react";
import splashHero from "@/assets/splash-hero.jpg";
import { Logo } from "@/components/Logo";

/**
 * Splash cinematográfico — exibido toda vez que o app abre em modo PWA standalone.
 * Em navegador comum não aparece (para não atrapalhar o desenvolvimento/preview).
 */
export function SplashIntro() {
  const [show, setShow] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Não mostra dentro do iframe do preview
    try { if (window.self !== window.top) return; } catch { return; }

    // Só ativa em PWA standalone (depois de instalado) — se quiser testar no navegador,
    // adicione ?splash=1 na URL.
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS
      // @ts-ignore
      window.navigator.standalone === true;
    const force = new URLSearchParams(window.location.search).get("splash") === "1";
    if (!isStandalone && !force) return;

    // Evita aparecer duas vezes na mesma sessão (ex: reload rápido)
    if (sessionStorage.getItem("fni_splash_seen") === "1") return;
    sessionStorage.setItem("fni_splash_seen", "1");

    setShow(true);
    const t1 = setTimeout(() => setClosing(true), 2400);
    const t2 = setTimeout(() => setShow(false), 3100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-hidden bg-black transition-opacity duration-700 ${closing ? "opacity-0" : "opacity-100"}`}
      aria-hidden="true"
    >
      {/* Imagem com Ken Burns */}
      <img
        src={splashHero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover splash-kenburns"
      />
      {/* Overlay gradiente cinematográfico */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/60" />
      {/* Letterbox */}
      <div className="absolute top-0 inset-x-0 h-[8vh] bg-black splash-bar-top" />
      <div className="absolute bottom-0 inset-x-0 h-[8vh] bg-black splash-bar-bottom" />

      {/* Conteúdo */}
      <div className="relative h-full flex flex-col items-center justify-center px-8 text-center">
        <div className="splash-logo">
          <Logo size="lg" className="drop-shadow-[0_8px_30px_rgba(0,0,0,0.7)]" />
        </div>
        <h1 className="mt-6 font-display font-bold text-4xl md:text-6xl text-white splash-title">
          FNI Promotores
        </h1>
        <p className="mt-3 text-white/80 text-sm md:text-base tracking-wide splash-tagline">
          Cada loja. Cada turno. Cada resultado.
        </p>
      </div>
    </div>
  );
}
