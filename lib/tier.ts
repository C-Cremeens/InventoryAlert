import type { Tier } from "@prisma/client";

export const TIER_LIMITS: Record<
  Tier,
  { maxItems: number; customLabels: boolean; label: string; price: string }
> = {
  FREE: {
    maxItems: 5,
    customLabels: false,
    label: "Free",
    price: "$0/mo",
  },
  FAMILY: {
    maxItems: Infinity,
    customLabels: true,
    label: "Family",
    price: "$9/mo",
  },
  ENTERPRISE: {
    maxItems: Infinity,
    customLabels: true,
    label: "Enterprise",
    price: "$29/mo",
  },
};

export function canCreateItem(tier: Tier, currentCount: number): boolean {
  return currentCount < TIER_LIMITS[tier].maxItems;
}
