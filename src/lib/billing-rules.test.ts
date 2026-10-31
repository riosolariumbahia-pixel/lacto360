import { describe, expect, it } from "vitest";
import { paidAccess, paymentEnvironment, PRO_AMOUNT, PRO_CURRENCY, PRO_PRICE_ID } from "./billing-rules";

describe("monthly Pro billing", () => {
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