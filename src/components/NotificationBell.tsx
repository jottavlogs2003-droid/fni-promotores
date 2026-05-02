import { useState } from "react";
import { Bell, BellRing, Check } from "lucide-react";
import { useNotificacoes } from "@/hooks/useNotificacoes";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function NotificationBell() {
  const { user } = useAuth();
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas, pedirPermissao } = useNotificacoes(user?.id);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) pedirPermissao(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          {naoLidas > 0 ? <BellRing className="h-5 w-5 text-primary" /> : <Bell className="h-5 w-5" />}
          {naoLidas > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <p className="font-semibold text-sm">Notificações</p>
          {naoLidas > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={marcarTodasLidas}>
              <Check className="h-3 w-3" /> Marcar todas
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-auto">
          {notificacoes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center p-6">Sem notificações.</p>
          )}
          {notificacoes.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.lida && marcarLida(n.id)}
              className={`w-full text-left p-3 border-b border-border/60 hover:bg-accent/40 transition-colors ${!n.lida ? "bg-primary/5" : ""}`}
            >
              <div className="flex items-start gap-2">
                {!n.lida && <span className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{n.titulo}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.mensagem}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
