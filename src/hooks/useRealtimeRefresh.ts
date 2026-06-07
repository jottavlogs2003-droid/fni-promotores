import { DependencyList, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeRefresh(
  tables: string[],
  reload: () => void | Promise<void>,
  deps: DependencyList,
  intervalMs = 15000,
) {
  const tablesKey = tables.filter(Boolean).sort().join("|");
  const reloadRef = useRef(reload);
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  const lastRunRef = useRef(0);

  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let active = true;
    const clearPending = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const executeReload = async () => {
      if (!active || inFlightRef.current) {
        queuedRef.current = true;
        return;
      }

      inFlightRef.current = true;
      queuedRef.current = false;

      try {
        await Promise.resolve(reloadRef.current());
        lastRunRef.current = Date.now();
      } catch (error) {
        console.error("realtime refresh error", error);
      } finally {
        inFlightRef.current = false;
        if (active && queuedRef.current) {
          queuedRef.current = false;
          scheduleReload(true);
        }
      }
    };

    const scheduleReload = (priority = false) => {
      if (!active || !navigator.onLine) return;
      if (document.hidden && !priority) return;

      const elapsed = Date.now() - lastRunRef.current;
      const debounceMs = priority ? 0 : Math.max(0, 1200 - elapsed);

      clearPending();
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void executeReload();
      }, debounceMs);
    };

    scheduleReload(true);

    const uniqueTables = Array.from(new Set(tablesKey ? tablesKey.split("|") : []));
    const channel = uniqueTables.reduce(
      (acc, table) => acc.on("postgres_changes", { event: "*", schema: "public", table }, () => scheduleReload()),
      supabase.channel(`rt-${uniqueTables.join("-") || "none"}-${Math.random().toString(36).slice(2)}`),
    ).subscribe();

    const handleFocus = () => scheduleReload(true);
    const handleOnline = () => scheduleReload(true);
    const handleVisibility = () => {
      if (!document.hidden) scheduleReload(true);
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    const intervalId = window.setInterval(() => scheduleReload(), intervalMs);

    return () => {
      active = false;
      clearPending();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [intervalMs, tablesKey, ...deps]);
}