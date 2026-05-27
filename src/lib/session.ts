import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Plan = "trial" | "pro";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  laticinio: string;
};

export type Session = {
  ready: boolean;
  user: SessionUser | null;
  orgId: string | null;
  role: AppRole | null;
  plan: Plan;
  trialEndsAt: number | null;
  trialStartedAt: number | null;
  onboarded: boolean;
};

const ONB_KEY = "sl360.onboarded";

const DEFAULT: Session = {
  ready: false,
  user: null,
  orgId: null,
  role: null,
  plan: "trial",
  trialEndsAt: null,
  trialStartedAt: null,
  onboarded: false,
};

const listeners = new Set<() => void>();
let cache: Session = DEFAULT;
let initialized = false;

function emit(next: Session) {
  cache = next;
  listeners.forEach((l) => l());
}

function onboardKey(orgId: string | null, userId: string) {
  return `${ONB_KEY}.${orgId ?? userId}`;
}

function clearOnboardingCache() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ONB_KEY);
  for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(`${ONB_KEY}.`)) window.localStorage.removeItem(key);
  }
}

async function hydrate(userId: string | null, email: string | null) {
  if (!userId) {
    emit({ ...DEFAULT, ready: true });
    return;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, org_id, organizations(name, plan, trial_ends_at, onboarded_at)")
    .eq("id", userId)
    .maybeSingle();
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);

  const orgRaw = profile?.organizations as
    | { name: string; plan: string; trial_ends_at: string; onboarded_at: string | null }
    | { name: string; plan: string; trial_ends_at: string; onboarded_at: string | null }[]
    | null
    | undefined;
  const org = Array.isArray(orgRaw) ? (orgRaw[0] ?? null) : (orgRaw ?? null);
  const trialEndsAt = org?.trial_ends_at ? new Date(org.trial_ends_at).getTime() : null;
  const onboarded =
    !!org?.onboarded_at ||
    (typeof window !== "undefined" &&
      window.localStorage.getItem(onboardKey(profile?.org_id ?? null, userId)) === "1");

  emit({
    ready: true,
    user: {
      id: userId,
      email: email ?? "",
      name: profile?.full_name ?? email?.split("@")[0] ?? "Usuário",
      laticinio: org?.name ?? "Meu laticínio",
    },
    orgId: profile?.org_id ?? null,
    role: (roles?.[0]?.role as AppRole | undefined) ?? null,
    plan: org?.plan === "pro" ? "pro" : "trial",
    trialEndsAt,
    trialStartedAt: trialEndsAt ? trialEndsAt - 7 * 86400000 : null,
    onboarded,
  });
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  supabase.auth.onAuthStateChange((_e, sess) => {
    void hydrate(sess?.user?.id ?? null, sess?.user?.email ?? null);
  });
  void supabase.auth.getSession().then(({ data }) => {
    void hydrate(data.session?.user?.id ?? null, data.session?.user?.email ?? null);
  });
}

export function useSession(): Session {
  const [, force] = useState(0);
  useEffect(() => {
    init();
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return cache;
}

export const sessionApi = {
  get: () => cache,
  async signIn(email: string, password: string) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore stale sessions
    }
    clearOnboardingCache();
    emit({ ...DEFAULT, ready: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) await hydrate(data.user?.id ?? null, data.user?.email ?? email);
    return error;
  },
  async signUp(opts: { fullName: string; email: string; password: string; companyName: string; inviteToken?: string }) {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/app` : undefined;
    // Evita que a sessão de um usuário anterior "vaze" para a nova conta
    // (signup com confirmação de e-mail não cria nova sessão automaticamente,
    // então sem signOut o navegador continua logado como o usuário anterior
    // e exibe os dados da organização errada).
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    clearOnboardingCache();
    emit({ ...DEFAULT, ready: true });
    const { error } = await supabase.auth.signUp({
      email: opts.email,
      password: opts.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: opts.fullName,
          company_name: opts.companyName,
          invite_token: opts.inviteToken,
        },
      },
    });
    return error;
  },
  async signOut() {
    await supabase.auth.signOut();
    clearOnboardingCache();
    emit({ ...DEFAULT, ready: true });
  },
  async setOnboarded(v: boolean) {
    if (cache.orgId) {
      const { error } = await supabase
        .from("organizations")
        .update({ onboarded_at: v ? new Date().toISOString() : null })
        .eq("id", cache.orgId);
      if (error) throw error;
    }
    if (typeof window !== "undefined" && cache.user) {
      const key = onboardKey(cache.orgId, cache.user.id);
      if (v) window.localStorage.setItem(key, "1");
      else window.localStorage.removeItem(key);
    }
    emit({ ...cache, onboarded: v });
  },
  async upgrade() {
    if (!cache.orgId) return;
    await supabase.from("organizations").update({ plan: "pro" }).eq("id", cache.orgId);
    emit({ ...cache, plan: "pro" });
  },
  async resetPassword(email: string) {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return error;
  },
};

export function trialDaysLeft(s: Session) {
  if (!s.trialEndsAt) return 7;
  const left = (s.trialEndsAt - Date.now()) / 86400000;
  return Math.max(0, Math.ceil(left));
}

export function homeForRole(role: AppRole | null): string {
  switch (role) {
    case "op_manager":
      return "/app/producao";
    case "sales_manager":
      return "/app/vendas";
    case "seller":
      return "/app/vendas";
    case "admin":
    default:
      return "/app";
  }
}
