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
  PRO: {
    maxItems: Infinity,
    customLabels: true,
    label: "Pro",
    price: "$29/mo",
  },
};

export function canCreateItem(tier: Tier, currentCount: number): boolean {
  return currentCount < TIER_LIMITS[tier].maxItems;
}
