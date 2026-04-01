import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TIER_LIMITS } from "@/lib/tier";
import TierBadge from "@/components/layout/TierBadge";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) return null;

  const [user, itemCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        name: true,
        tier: true,
        stripeSubscriptionId: true,
        stripeCurrentPeriodEnd: true,
      },
    }),
    prisma.inventoryItem.count({ where: { userId: session.user.id } }),
  ]);

  if (!user) return null;

  const tier = user.tier;
  const limit = TIER_LIMITS[tier];

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Account */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-3">
        <h2 className="font-semibold text-gray-900">Account</h2>
        <div className="text-sm text-gray-600">
          <p>
            <span className="text-gray-400">Name:</span>{" "}
            {user.name ?? "—"}
          </p>
          <p className="mt-1">
            <span className="text-gray-400">Email:</span> {user.email}
          </p>
        </div>
      </section>

      {/* Plan */}
      <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Current Plan</h2>
          <TierBadge tier={tier} />
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <span className="text-gray-400">Price:</span> {limit.price}
          </p>
          <p>
            <span className="text-gray-400">Item limit:</span>{" "}
            {limit.maxItems === Infinity ? "Unlimited" : limit.maxItems}
          </p>
          <p>
            <span className="text-gray-400">Items used:</span> {itemCount}
            {limit.maxItems !== Infinity && ` / ${limit.maxItems}`}
          </p>
          {user.stripeCurrentPeriodEnd && (
            <p>
              <span className="text-gray-400">Renews:</span>{" "}
              {new Date(user.stripeCurrentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Progress bar for free tier */}
        {limit.maxItems !== Infinity && (
          <div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (itemCount / limit.maxItems) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {itemCount} of {limit.maxItems} items used
            </p>
          </div>
        )}

        <SettingsClient
          currentTier={tier}
          hasSubscription={!!user.stripeSubscriptionId}
        />
      </section>
    </div>
  );
}
