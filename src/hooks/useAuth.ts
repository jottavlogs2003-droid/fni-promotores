import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "contratante" | "promotor";

export interface Profile {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  avatar_url: string | null;
  cliente_id: string | null;
  ativo: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  primaryRole: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadUserData(userId: string) {
    try {
      const [{ data: prof, error: profErr }, { data: rolesData, error: rolesErr }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

      if (profErr) throw profErr;
      if (rolesErr) throw rolesErr;

      setProfile(prof as Profile | null);
      setRoles((rolesData?.map(r => r.role) ?? []) as AppRole[]);
    } catch (error) {
      console.error("Error loading user data:", error);
      // Even on error, we stop loading to prevent infinite spinner
      setProfile(null);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        loadUserData(initialSession.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await loadUserData(currentSession.user.id);
        }
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const primaryRole: AppRole | null =
    roles.includes("admin") ? "admin" :
    roles.includes("contratante") ? "contratante" :
    roles.includes("promotor") ? "promotor" : null;

  const handleSignOut = async () => {
    try {
      Object.keys(localStorage).filter(k => k.startsWith("fni_tour_done_")).forEach(k => localStorage.removeItem(k));
      sessionStorage.removeItem("fni_splash_seen");
      await supabase.auth.signOut();
    } catch (e) {
      console.error("signOut error", e);
    } finally {
      window.location.replace("/auth");
    }
  };

  const value = {
    user,
    session,
    profile,
    roles,
    primaryRole,
    loading,
    signOut: handleSignOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Keep export for backward compatibility where it's used directly
export async function signOut() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith("fni_tour_done_")).forEach(k => localStorage.removeItem(k));
    sessionStorage.removeItem("fni_splash_seen");
    await supabase.auth.signOut();
  } catch (e) {
    console.error("signOut error", e);
  } finally {
    window.location.replace("/auth");
  }
}
