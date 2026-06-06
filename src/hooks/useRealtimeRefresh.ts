import { DependencyList, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeRefresh(
  tables: string[],
  reload: () => void | Promise<void>,
  deps: DependencyList,
  intervalMs = 15000,
) {
  const reloadRef = useRef(reload);

  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let active = true;
    const safeReload = () => {
      if (!active) return;
      void Promise.resolve(reloadRef.current()).catch((error) => {
        console.error("realtime refresh error", error);
      });
    };

    safeReload();

    const uniqueTables = Array.from(new Set(tables.filter(Boolean)));
    const channels = uniqueTables.map((table, index) =>
      supabase
        .channel(`rt-${table}-${index}-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, safeReload)
        .subscribe(),
    );

    window.addEventListener("focus", safeReload);
    window.addEventListener("online", safeReload);
    const intervalId = window.setInterval(safeReload, intervalMs);

    return () => {
      active = false;
      window.removeEventListener("focus", safeReload);
      window.removeEventListener("online", safeReload);
      window.clearInterval(intervalId);
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, deps);
}