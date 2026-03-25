import type { Tier } from "@prisma/client";
import { TIER_LIMITS } from "@/lib/tier";

const colors: Record<Tier, string> = {
  FREE: "bg-gray-100 text-gray-600",
  FAMILY: "bg-green-100 text-green-700",
  ENTERPRISE: "bg-purple-100 text-purple-700",
};

export default function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[tier]}`}
    >
      {TIER_LIMITS[tier].label}
    </span>
  );
}
