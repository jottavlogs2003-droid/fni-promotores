import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, MapPin, ShieldCheck, BarChart3, Smartphone, Eye, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

import heroImg from "@/assets/hero-promoter.jpg";
import mobileImg from "@/assets/feature-mobile.jpg";
import coverageImg from "@/assets/feature-coverage.jpg";
import analyticsImg from "@/assets/feature-analytics.jpg";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.15 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

export default function Landing() {
  const { user, primaryRole } = useAuth();
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleEnter = () => {
    if (user) navigate("/app");
    else navigate("/auth");
  };

  const features = [
    { icon: MapPin, title: "GEOLOCALIZAÇÃO", desc: "Check-in validado por GPS no raio exato da loja." },
    { icon: Smartphone, title: "MOBILE FIRST", desc: "PWA instalável. O promotor opera direto do celular." },
    { icon: Eye, title: "VISIBILIDADE TOTAL", desc: "Fotos antes/depois, ruptura e validade em tempo real." },
    { icon: BarChart3, title: "DASHBOARD VIVO", desc: "Performance, score e ranking dos seus promotores." },
    { icon: ShieldCheck, title: "ANTI-FRAUDE", desc: "Selfie obrigatória. Sem rastreabilidade, não há registro." },
  ];

  const f1 = useReveal(), f2 = useReveal(), f3 = useReveal(), f4 = useReveal(), cta = useReveal();

  return (
    <div className="bg-[#0A0A0B] text-white overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-black/30 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="sm" className="brightness-0 invert" />
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/auth" className="text-sm text-white/70 hover:text-white transition px-3 py-2">Entrar</Link>
            <Button onClick={handleEnter} variant="brand" size="sm">
              {user ? "Acessar app" : "Começar"}
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO — fullscreen cinemático */}
      <section className="relative h-screen w-full overflow-hidden">
        <img
          src={heroImg}
          alt="Promotora de campo FNI em loja"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: `translateY(${scrollY * 0.4}px) scale(${1 + scrollY * 0.0003})` }}
          width={1920} height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/60" />

        <div className="relative z-10 h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-24 sm:pb-32">
          <div
            className="space-y-6 max-w-4xl"
            style={{ opacity: Math.max(0, 1 - scrollY / 400), transform: `translateY(${scrollY * -0.2}px)` }}
          >
            <p className="text-xs sm:text-sm tracking-[0.4em] text-primary font-semibold uppercase animate-fade-in-up">
              FNI Promotores · Sistema Operacional de Campo
            </p>
            <h1 className="font-display font-black leading-[0.9] text-5xl sm:text-7xl lg:text-9xl">
              EXECUÇÃO<br/>
              <span className="text-gradient">EM CADA</span><br/>
              GÔNDOLA.
            </h1>
            <p className="text-lg sm:text-xl text-white/80 max-w-xl font-light">
              Cada produto na prateleira é uma decisão. Cada decisão, uma venda.
              <br className="hidden sm:block"/> Nós controlamos o invisível.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleEnter} variant="brand" size="xl" className="group">
                {user ? "Entrar no sistema" : "Acessar plataforma"}
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition" />
              </Button>
              <Button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                variant="outline" size="xl"
                className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                Ver como funciona
              </Button>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="h-6 w-6 text-white/60" />
          </div>
        </div>
      </section>

      {/* MANIFESTO BLOCK */}
      <section className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-primary font-semibold mb-6">MANIFESTO</p>
          <h2 className="font-display font-black text-4xl sm:text-6xl lg:text-7xl leading-tight">
            Onde o varejo acontece de verdade,
            <span className="text-white/40"> não há lugar para achismo.</span>
          </h2>
        </div>
      </section>

      {/* FEATURE 1 — Mobile */}
      <section id="features" ref={f1.ref}
        className={`relative min-h-screen flex items-center px-6 py-24 transition-all duration-1000 ${f1.visible ? "opacity-100" : "opacity-0 translate-y-12"}`}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 space-y-6">
            <p className="text-xs tracking-[0.4em] text-primary font-semibold">01 — O CAMPO</p>
            <h3 className="font-display font-black text-5xl lg:text-6xl leading-tight">
              O celular vira<br/>uma <span className="text-gradient">ferramenta industrial</span>.
            </h3>
            <p className="text-lg text-white/70 max-w-md">
              Check-in com GPS. Selfie obrigatória. Checklist de execução. Fotos antes e depois.
              Tudo em segundos, em qualquer loja, com ou sem reposição.
            </p>
          </div>
          <div className="order-1 lg:order-2 relative aspect-[3/4] max-w-md mx-auto w-full">
            <div className="absolute -inset-4 bg-gradient-to-tr from-primary/30 to-secondary/30 blur-3xl rounded-full" />
            <img src={mobileImg} alt="App mobile FNI" loading="lazy" width={1080} height={1440}
              className="relative rounded-3xl object-cover h-full w-full shadow-2xl" />
          </div>
        </div>
      </section>

      {/* FEATURE 2 — Coverage (full bleed) */}
      <section ref={f2.ref}
        className={`relative h-screen w-full overflow-hidden transition-all duration-1000 ${f2.visible ? "opacity-100" : "opacity-0"}`}>
        <img src={coverageImg} alt="Cobertura nacional FNI" loading="lazy" width={1920} height={1080}
          className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
        <div className="relative z-10 h-full max-w-7xl mx-auto px-6 flex flex-col justify-end pb-24">
          <p className="text-xs tracking-[0.4em] text-primary font-semibold mb-4">02 — COBERTURA</p>
          <h3 className="font-display font-black text-5xl lg:text-8xl leading-[0.9] max-w-4xl">
            CADA LOJA.<br/>
            <span className="text-gradient">CADA PONTO.</span><br/>
            CADA DIA.
          </h3>
        </div>
      </section>

      {/* FEATURE 3 — Analytics */}
      <section ref={f3.ref}
        className={`relative min-h-screen flex items-center px-6 py-24 transition-all duration-1000 ${f3.visible ? "opacity-100" : "opacity-0 translate-y-12"}`}>
        <div className="max-w-7xl mx-auto grid lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-3 relative aspect-video">
            <div className="absolute -inset-4 bg-gradient-to-bl from-secondary/40 to-primary/20 blur-3xl rounded-full" />
            <img src={analyticsImg} alt="Dashboard analytics FNI" loading="lazy" width={1920} height={1080}
              className="relative rounded-2xl object-cover h-full w-full shadow-2xl" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <p className="text-xs tracking-[0.4em] text-primary font-semibold">03 — INTELIGÊNCIA</p>
            <h3 className="font-display font-black text-4xl lg:text-5xl leading-tight">
              Dashboards que<br/>respondem antes<br/>da pergunta.
            </h3>
            <p className="text-lg text-white/70">
              Score por promotor. Ranking por região. Conformidade por loja.
              Você vê o que ninguém via — em tempo real.
            </p>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section ref={f4.ref}
        className={`px-6 py-32 border-t border-white/5 transition-all duration-1000 ${f4.visible ? "opacity-100" : "opacity-0"}`}>
        <div className="max-w-7xl mx-auto">
          <p className="text-xs tracking-[0.4em] text-primary font-semibold mb-4">SISTEMA COMPLETO</p>
          <h3 className="font-display font-black text-4xl lg:text-6xl mb-16 max-w-3xl leading-tight">
            Cinco pilares.<br/>
            <span className="text-white/40">Zero margem para erro.</span>
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-white/5">
            {features.map((f, i) => (
              <div key={i} className="bg-[#0A0A0B] p-8 hover:bg-white/[0.03] transition-colors group">
                <f.icon className="h-8 w-8 text-primary mb-6 group-hover:scale-110 transition-spring" />
                <p className="text-xs tracking-widest font-semibold text-white/50 mb-2">0{i + 1}</p>
                <h4 className="font-display font-bold text-lg mb-2">{f.title}</h4>
                <p className="text-sm text-white/60 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={cta.ref}
        className={`relative px-6 py-32 overflow-hidden transition-all duration-1000 ${cta.visible ? "opacity-100" : "opacity-0"}`}>
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay" loading="lazy" />
        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <h3 className="font-display font-black text-5xl sm:text-7xl lg:text-8xl leading-[0.9]">
            HORA DE<br/><span className="text-gradient">EXECUTAR</span>.
          </h3>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Acesso por perfil: Administrador, Contratante e Promotor. Cada um vê exatamente o que precisa.
          </p>
          <div className="flex flex-wrap gap-4 justify-center pt-4">
            <Button onClick={handleEnter} variant="brand" size="xl">
              {user ? `Entrar como ${primaryRole}` : "Acessar plataforma"}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Diferenciais FNI */}
          <div className="mt-16 pt-8 border-t border-white/10 max-w-3xl mx-auto">
            <p className="text-xs tracking-[0.3em] text-white/50 mb-6">POR QUE FNI</p>
            <div className="grid sm:grid-cols-3 gap-4 text-left">
              {[
                { n: "+10", l: "anos no varejo", d: "Operação de campo nas maiores redes do país." },
                { n: "100%", l: "rastreável", d: "Cada minuto em loja, com GPS, foto e selfie." },
                { n: "24/7", l: "tempo real", d: "Você acompanha a execução enquanto ela acontece." },
              ].map((c) => (
                <div key={c.l} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <p className="text-3xl font-display font-black text-gradient">{c.n}</p>
                  <p className="text-xs text-primary font-semibold tracking-wider uppercase mt-1">{c.l}</p>
                  <p className="text-sm text-white/70 mt-2 leading-relaxed">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" className="brightness-0 invert opacity-60" />
          <p className="text-xs text-white/40">© {new Date().getFullYear()} FNI Promotores · Sistema operacional de campo.</p>
        </div>
      </footer>
    </div>
  );
}
