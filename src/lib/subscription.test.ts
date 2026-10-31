import { describe, expect, it } from "vitest";
import { isSubscriptionActive } from "./subscription";

const now = 1_800_000_000_000;
describe("isSubscriptionActive", () => {
  it("pro is active", () => expect(isSubscriptionActive({ plan: "pro", trialEndsAt: now - 1 }, now)).toBe(true));
  it("expired trial is inactive", () => expect(isSubscriptionActive({ plan: "trial", trialEndsAt: now - 1 }, now)).toBe(false));
  it("trial within period is active", () => expect(isSubscriptionActive({ plan: "trial", trialEndsAt: now + 86400000 }, now)).toBe(true));
});
