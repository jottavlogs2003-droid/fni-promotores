import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Notificacao = {
  id: string;
  user_id: string;
  titulo: string;
  mensagem: string;
  tipo: string | null;
  lida: boolean;
  created_at: string;
};

export function useNotificacoes(userId: string | undefined) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let mounted = true;

    (async () => {
      const { data } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (mounted) {
        setNotificacoes((data ?? []) as Notificacao[]);
        setLoading(false);
      }
    })();

    const ch = supabase
      .channel(`notif-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotificacoes((prev) => [payload.new as Notificacao, ...prev].slice(0, 50));
          // Notificação nativa do navegador (se permitido)
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            const n = payload.new as Notificacao;
            try { new Notification(n.titulo, { body: n.mensagem, icon: "/icon-192.png" }); } catch {}
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notificacoes", filter: `user_id=eq.${userId}` },
        () => {
          void supabase
            .from("notificacoes")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50)
            .then(({ data }) => setNotificacoes((data ?? []) as Notificacao[]));
        }
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [userId]);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  async function marcarLida(id: string) {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  }

  async function marcarTodasLidas() {
    if (!userId) return;
    await supabase.from("notificacoes").update({ lida: true }).eq("user_id", userId).eq("lida", false);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
  }

  async function pedirPermissao() {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const r = await Notification.requestPermission();
    return r === "granted";
  }

  return { notificacoes, naoLidas, loading, marcarLida, marcarTodasLidas, pedirPermissao };
}
