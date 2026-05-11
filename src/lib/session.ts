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

async function hydrate(userId: string | null, email: string | null) {
  if (!userId) {
    emit({ ...DEFAULT, ready: true });
    return;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, org_id, organizations(name, plan, trial_ends_at)")
    .eq("id", userId)
    .maybeSingle();
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);

  const org = (profile?.organizations as { name: string; plan: string; trial_ends_at: string } | null) ?? null;
  const trialEndsAt = org?.trial_ends_at ? new Date(org.trial_ends_at).getTime() : null;
  const onboarded = typeof window !== "undefined" && window.localStorage.getItem(ONB_KEY) === "1";

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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  },
  async signUp(opts: { fullName: string; email: string; password: string; companyName: string; inviteToken?: string }) {
    const redirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/app` : undefined;
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
    if (typeof window !== "undefined") window.localStorage.removeItem(ONB_KEY);
  },
  setOnboarded(v: boolean) {
    if (typeof window === "undefined") return;
    if (v) window.localStorage.setItem(ONB_KEY, "1");
    else window.localStorage.removeItem(ONB_KEY);
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
