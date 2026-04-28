import { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { signOut, useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

interface NavItem { to: string; label: string; icon: React.ComponentType<{ className?: string }>; }

export function MobileAppLayout({ items, children }: { items: NavItem[]; children: ReactNode }) {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-sidebar text-sidebar-foreground safe-top">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <div>
              <p className="font-display font-bold text-sm leading-tight">FNI Promotores</p>
              <p className="text-[11px] text-sidebar-foreground/60 leading-tight">Olá, {profile?.nome?.split(" ")[0]}</p>
            </div>
          </div>
          <button onClick={signOut} className="p-2 -mr-2"><LogOut className="h-5 w-5" /></button>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div className="p-4 max-w-2xl mx-auto">{children}</div>
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-40 safe-bottom shadow-[0_-4px_16px_-8px_rgba(0,0,0,0.1)]">
        <div className="grid grid-cols-4 max-w-2xl mx-auto">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-base",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
