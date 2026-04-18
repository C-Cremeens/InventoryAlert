import type { Tier } from "@prisma/client";
import { TIER_LIMITS } from "@/lib/tier";

const colors: Record<Tier, string> = {
  FREE: "bg-surface-container-high text-on-surface-variant",
  PRO: "bg-primary-fixed text-on-primary-fixed",
};

export default function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[tier]}`}
    >
      {TIER_LIMITS[tier].label}
    </span>
  );
}
