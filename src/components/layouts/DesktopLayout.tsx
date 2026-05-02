import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { signOut, useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { NotificationBell } from "@/components/NotificationBell";
import { InstallPrompt } from "@/components/InstallPrompt";
import { cn } from "@/lib/utils";

interface NavItem { to: string; label: string; icon: React.ComponentType<{ className?: string }>; }

export function DesktopLayout({ items, children, title }: { items: NavItem[]; children: ReactNode; title: string }) {
  const { profile } = useAuth();
  const [openMobile, setOpenMobile] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground p-4 gap-2">
        <div className="flex items-center gap-3 px-2 py-4 border-b border-sidebar-border mb-2">
          <Logo size="sm" />
          <div>
            <p className="font-display font-bold text-sm">FNI</p>
            <p className="text-xs text-sidebar-foreground/60">{title}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-base",
              isActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-brand" : "hover:bg-sidebar-accent"
            )}>
              <Icon className="h-4 w-4" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border pt-3 flex items-center gap-2">
          <Avatar className="h-9 w-9"><AvatarImage src={profile?.avatar_url ?? undefined} /><AvatarFallback>{profile?.nome?.[0] ?? "U"}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.nome}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{profile?.email}</p>
          </div>
          <NotificationBell />
          <Button size="icon" variant="ghost" onClick={signOut} className="hover:bg-sidebar-accent text-sidebar-foreground"><LogOut className="h-4 w-4" /></Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-sidebar text-sidebar-foreground safe-top">
        <div className="flex items-center justify-between p-3">
          <button onClick={() => setOpenMobile(!openMobile)} className="p-2">
            {openMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2"><Logo size="sm" /><span className="text-sm font-display font-bold">{title}</span></div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button onClick={signOut} className="p-2"><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
        {openMobile && (
          <nav className="border-t border-sidebar-border p-2 space-y-1">
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end onClick={() => setOpenMobile(false)} className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"
              )}>
                <Icon className="h-4 w-4" /> {label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      <main className="flex-1 min-w-0 pt-16 lg:pt-0">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
      <InstallPrompt />
    </div>
  );
}
