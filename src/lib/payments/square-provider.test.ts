import { describe, it, expect } from "vitest";
import { mapSquareSubscriptionStatus, familyDiscountPriceCents } from "./square-provider";

describe("mapSquareSubscriptionStatus", () => {
  // Must land in the same status vocabulary the Stripe webhook produces —
  // marketing triggers and MRR reports key off these values
  it.each([
    ["ACTIVE", "active"],
    ["PENDING", "active"],
    ["PAUSED", "inactive"],
    ["CANCELED", "canceled"],
    ["DEACTIVATED", "canceled"],
    ["SOMETHING_NEW", "inactive"],
    [null, "inactive"],
    [undefined, "inactive"],
  ])("maps %s → %s", (input, expected) => {
    expect(mapSquareSubscriptionStatus(input as never)).toBe(expected);
  });
});

describe("familyDiscountPriceCents", () => {
  it("computes the discounted price as a rounded override", () => {
    expect(familyDiscountPriceCents(10000, 10)).toBe(9000);
    expect(familyDiscountPriceCents(9999, 10)).toBe(8999);  // 8999.1 rounds down
    expect(familyDiscountPriceCents(15000, 25)).toBe(11250);
    expect(familyDiscountPriceCents(10000, 100)).toBe(0);
  });
});
