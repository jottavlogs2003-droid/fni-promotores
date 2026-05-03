import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { pendingCount, syncQueue } from "@/lib/offlineQueue";
import { toast } from "sonner";

export function OfflineBadge() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pend, setPend] = useState(pendingCount());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const tick = () => setPend(pendingCount());
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const id = setInterval(tick, 3000);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); clearInterval(id); };
  }, []);

  if (online && pend === 0) return null;

  return (
    <button
      onClick={async () => {
        if (!online) { toast.info("Sem conexão. Os dados serão enviados ao reconectar."); return; }
        setBusy(true);
        const r = await syncQueue();
        setBusy(false);
        setPend(pendingCount());
        if (r.ok) toast.success(`${r.ok} check-in(s) sincronizado(s).`);
        if (r.fail) toast.error(`${r.fail} ainda pendente(s).`);
      }}
      className={`fixed top-16 right-3 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${
        online ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground"
      }`}
    >
      {online ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
      {online ? `${pend} pendente(s)` : "Offline"}
      {busy && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
    </button>
  );
}
