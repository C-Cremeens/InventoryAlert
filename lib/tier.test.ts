import { describe, it, expect } from "vitest";
import { TIER_LIMITS, canCreateItem } from "./tier";

describe("canCreateItem", () => {
  it("allows FREE users below the item limit", () => {
    expect(canCreateItem("FREE", 0)).toBe(true);
    expect(canCreateItem("FREE", TIER_LIMITS.FREE.maxItems - 1)).toBe(true);
  });

  it("blocks FREE users at and above the item limit", () => {
    expect(canCreateItem("FREE", TIER_LIMITS.FREE.maxItems)).toBe(false);
    expect(canCreateItem("FREE", TIER_LIMITS.FREE.maxItems + 10)).toBe(false);
  });

  it("never blocks PRO users", () => {
    expect(canCreateItem("PRO", 0)).toBe(true);
    expect(canCreateItem("PRO", 100_000)).toBe(true);
  });
});

describe("TIER_LIMITS", () => {
  it("gates custom labels and scan controls to PRO", () => {
    expect(TIER_LIMITS.FREE.customLabels).toBe(false);
    expect(TIER_LIMITS.FREE.scanControls).toBe(false);
    expect(TIER_LIMITS.PRO.customLabels).toBe(true);
    expect(TIER_LIMITS.PRO.scanControls).toBe(true);
  });
});
