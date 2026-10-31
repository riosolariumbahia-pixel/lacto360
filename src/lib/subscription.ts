export type SubscriptionInput = { plan: string | null; trialEndsAt: number | null };

/** Pro is always active; trial is active only while trial_ends_at is in the future. */
export function isSubscriptionActive(s: SubscriptionInput, now = Date.now()): boolean {
  if (s.plan === "pro") return true;
  if (!s.trialEndsAt) return false;
  return s.trialEndsAt > now;
}
