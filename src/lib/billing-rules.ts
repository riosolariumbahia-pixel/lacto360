export const PRO_PRICE_ID = "lacto360_pro_monthly";
export const PRO_AMOUNT = 9700;
export const PRO_CURRENCY = "brl";
export const BILLING_POLICY = {
  scope: "organization",
  charge: "immediate",
  cancellation: "at_period_end",
  planSwitching: false,
} as const;
export const BILLING_PORTAL_FEATURES = {
  customer_update: { enabled: true, allowed_updates: ["address", "email", "name", "phone", "tax_id"] },
  invoice_history: { enabled: true },
  payment_method_update: { enabled: true },
  subscription_cancel: { enabled: true, mode: BILLING_POLICY.cancellation, proration_behavior: "none" },
  subscription_update: { enabled: BILLING_POLICY.planSwitching },
} as const;
export type BillingEnvironment = "sandbox" | "live";

export function paymentEnvironment(token: string | undefined): BillingEnvironment {
  if (token?.startsWith("pk_test_")) return "sandbox";
  if (token?.startsWith("pk_live_")) return "live";
  throw new Error("Pagamentos indisponíveis. A ativação dos pagamentos reais ainda precisa ser concluída.");
}

export function paidAccess(status: string, periodEnd: string | null, now = Date.now()): boolean {
  const future = periodEnd !== null && Date.parse(periodEnd) > now;
  return (["active", "trialing", "past_due"].includes(status) && (periodEnd === null || future)) ||
    (status === "canceled" && future);
}