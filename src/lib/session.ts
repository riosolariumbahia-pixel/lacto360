import { useEffect, useState, useSyncExternalStore } from "react";

export type Plan = "trial" | "pro";
export type Session = {
  user: { name: string; email: string; laticinio: string } | null;
  trialStartedAt: number | null;
  plan: Plan;
  onboarded: boolean;
};

const KEY = "sl360.session";
const DEFAULT: Session = { user: null, trialStartedAt: null, plan: "trial", onboarded: false };

const listeners = new Set<() => void>();
let cache: Session = DEFAULT;
let hydrated = false;

function read(): Session {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function write(s: Session) {
  cache = s;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  if (!hydrated && typeof window !== "undefined") {
    cache = read();
    hydrated = true;
  }
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useSession() {
  const s = useSyncExternalStore(
    subscribe,
    () => cache,
    () => DEFAULT,
  );
  return s;
}

export const sessionApi = {
  get: () => (hydrated ? cache : read()),
  signIn(email: string, name = "João Silva", laticinio = "Laticínio Vale Verde") {
    const cur = read();
    write({
      ...cur,
      user: { email, name, laticinio },
      trialStartedAt: cur.trialStartedAt ?? Date.now(),
    });
  },
  signUp(name: string, email: string, laticinio: string) {
    write({
      user: { name, email, laticinio },
      trialStartedAt: Date.now(),
      plan: "trial",
      onboarded: false,
    });
  },
  setOnboarded(v: boolean) {
    write({ ...read(), onboarded: v });
  },
  upgrade() {
    write({ ...read(), plan: "pro" });
  },
  signOut() {
    write(DEFAULT);
  },
};

export function trialDaysLeft(s: Session) {
  if (!s.trialStartedAt) return 7;
  const elapsed = (Date.now() - s.trialStartedAt) / 86400000;
  return Math.max(0, Math.ceil(7 - elapsed));
}

export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
