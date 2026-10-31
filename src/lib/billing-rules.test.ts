import { describe, expect, it } from "vitest";
import { BILLING_POLICY, BILLING_PORTAL_FEATURES, paidAccess, paymentEnvironment, PRO_AMOUNT, PRO_CURRENCY, PRO_PRICE_ID } from "./billing-rules";

describe("monthly Pro billing", () => {
  it("grants the purchased plan to the company", () => {
    expect(BILLING_POLICY.scope).toBe("organization");
  });
  it("charges the subscription immediately", () => {
    expect(BILLING_POLICY.charge).toBe("immediate");
  });
  it("schedules portal cancellation at the paid period end without proration", () => {
    expect(BILLING_PORTAL_FEATURES.subscription_cancel.mode).toBe("at_period_end");
    expect(BILLING_PORTAL_FEATURES.subscription_cancel.proration_behavior).toBe("none");
  });
  it("does not allow switching plans in the portal", () => {
    expect(BILLING_PORTAL_FEATURES.subscription_update.enabled).toBe(false);
  });
  it("charges the existing R$ 97 monthly plan", () => {
    expect(PRO_AMOUNT).toBe(9700);
    expect(PRO_CURRENCY).toBe("brl");
    expect(PRO_PRICE_ID).toBe("lacto360_pro_monthly");
  });
  it("never falls back to live without a valid token", () => {
    expect(() => paymentEnvironment(undefined)).toThrow();
    expect(() => paymentEnvironment("invalid")).toThrow();
    expect(paymentEnvironment("pk_test_example")).toBe("sandbox");
    expect(paymentEnvironment("pk_live_example")).toBe("live");
  });
  it("keeps canceled access until the paid period ends", () => {
    expect(paidAccess("canceled", "2026-11-30T00:00:00Z", Date.parse("2026-11-01"))).toBe(true);
    expect(paidAccess("canceled", "2026-10-30T00:00:00Z", Date.parse("2026-11-01"))).toBe(false);
  });
  it("does not grant access to an unpaid first invoice", () => {
    expect(paidAccess("incomplete", "2026-11-30T00:00:00Z")).toBe(false);
    expect(paidAccess("unpaid", null)).toBe(false);
  });
});