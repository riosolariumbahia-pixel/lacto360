import { reportError } from "./error-capture";

export const SAVE_ERROR_MSG = "Não foi possível salvar os dados no momento. Verifique sua conexão.";

/** Turns any thrown value into a user-friendly message, logging the original failure. */
export function friendlyError(e: unknown): string {
  reportError(e);
  const err = e as { code?: string; message?: string } | null;
  const msg = err?.message ?? "";
  if (err?.code === "42501" || /row-level security|permission|forbidden|permissão/i.test(msg)) {
    return "Você não tem permissão para realizar esta operação.";
  }
  if (/failed to fetch|network|timeout/i.test(msg) || !msg) return SAVE_ERROR_MSG;
  // Keep our own Portuguese messages; hide raw technical ones.
  if (/[ãçéêíóõú]/i.test(msg) && msg.length < 160) return msg;
  return SAVE_ERROR_MSG;
}

/** Wraps a database mutation with try/catch, error logging and a friendly error. */
export async function safeMutation<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw new Error(friendlyError(e));
  }
}

/** Wraps every write method (anything not starting with "list"/"get") of an API object with safeMutation. */
export function withSafeMutations<T extends Record<string, unknown>>(api: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(api)) {
    out[k] =
      typeof v === "function" && !/^(list|get)/.test(k)
        ? (...args: unknown[]) => safeMutation(() => (v as (...a: unknown[]) => Promise<unknown>).apply(api, args))
        : v;
  }
  return out as T;
}
