import { useSyncExternalStore } from "react";
import { Session, User } from "@supabase/supabase-js";
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

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  ready: boolean;
};

let state: AuthState = {
  user: null,
  session: null,
  profile: null,
  roles: [],
  loading: true,
  ready: false,
};

const listeners = new Set<() => void>();
let initialized = false;
let activeLoadToken = 0;

function emit() {
  listeners.forEach((listener) => listener());
}

function setState(next: Partial<AuthState>) {
  state = { ...state, ...next };
  emit();
}

async function loadUserData(userId: string) {
  const token = ++activeLoadToken;
  setState({ loading: true, ready: true });

  try {
    const [{ data: prof, error: profError }, { data: rolesData, error: rolesError }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    if (token !== activeLoadToken || state.user?.id !== userId) return;
    if (profError) console.error("profile load error", profError);
    if (rolesError) console.error("roles load error", rolesError);

    setState({
      profile: (prof as Profile | null) ?? null,
      roles: ((rolesData?.map((item) => item.role) ?? []) as AppRole[]),
      loading: false,
      ready: true,
    });
  } catch (error) {
    if (token !== activeLoadToken || state.user?.id !== userId) return;
    console.error("auth user data error", error);
    setState({ profile: null, roles: [], loading: false, ready: true });
  }
}

function clearAuthState() {
  activeLoadToken += 1;
  setState({
    user: null,
    session: null,
    profile: null,
    roles: [],
    loading: false,
    ready: true,
  });
}

function initAuth() {
  if (initialized) return;
  initialized = true;

  supabase.auth.getSession().then(({ data: { session } }) => {
    setState({ user: session?.user ?? null, session, ready: true });
    if (session?.user) {
      void loadUserData(session.user.id);
    } else {
      setState({ loading: false, ready: true, profile: null, roles: [] });
    }
  }).catch((error) => {
    console.error("auth session restore error", error);
    clearAuthState();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    setState({ user: session?.user ?? null, session, ready: true });

    if (session?.user) {
      queueMicrotask(() => {
        void loadUserData(session.user.id);
      });
      return;
    }

    clearAuthState();
  });
}

function subscribe(listener: () => void) {
  initAuth();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  initAuth();
  return state;
}

export function useAuth() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const primaryRole: AppRole | null =
    snapshot.roles.includes("admin") ? "admin" :
    snapshot.roles.includes("contratante") ? "contratante" :
    snapshot.roles.includes("promotor") ? "promotor" : null;

  return {
    ...snapshot,
    primaryRole,
  };
}

export async function signOut() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("fni_tour_done_"))
      .forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem("fni_splash_seen");
    clearAuthState();
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error("signOut error", error);
  } finally {
    window.location.replace("/auth");
  }
}