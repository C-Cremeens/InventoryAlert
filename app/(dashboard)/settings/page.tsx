import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TIER_LIMITS } from "@/lib/tier";
import { fetchStripePrices } from "@/lib/stripe";
import TierBadge from "@/components/layout/TierBadge";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) return null;

  const [user, itemCount, stripePrices] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        name: true,
        tier: true,
        stripeCustomerId: true,
        stripeCurrentPeriodEnd: true,
      },
    }),
    prisma.inventoryItem.count({ where: { userId: session.user.id } }),
    fetchStripePrices(),
  ]);

  if (!user) return null;

  const tier = user.tier;
  const limit = TIER_LIMITS[tier];

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-bold text-on-surface font-headline">Settings</h1>

      {/* Account */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm p-4 sm:p-6 space-y-3">
        <h2 className="font-semibold text-on-surface font-headline">Account</h2>
        <div className="text-sm text-on-surface-variant">
          <p>
            <span className="text-outline">Name:</span>{" "}
            {user.name ?? "—"}
          </p>
          <p className="mt-1">
            <span className="text-outline">Email:</span> {user.email}
          </p>
        </div>
      </section>

      {/* Plan */}
      <section className="bg-surface-container-lowest rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-on-surface font-headline">Current Plan</h2>
          <TierBadge tier={tier} />
        </div>

        <div className="text-sm text-on-surface-variant space-y-1">
          <p>
            <span className="text-outline">Price:</span>{" "}
            {tier === "FREE" ? limit.price : stripePrices[tier]}
          </p>
          <p>
            <span className="text-outline">Item limit:</span>{" "}
            {limit.maxItems === Infinity ? "Unlimited" : limit.maxItems}
          </p>
          <p>
            <span className="text-outline">Items used:</span> {itemCount}
            {limit.maxItems !== Infinity && ` / ${limit.maxItems}`}
          </p>
          {user.stripeCurrentPeriodEnd && (
            <p>
              <span className="text-outline">Renews:</span>{" "}
              {new Date(user.stripeCurrentPeriodEnd).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Progress bar for free tier */}
        {limit.maxItems !== Infinity && (
          <div>
            <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (itemCount / limit.maxItems) * 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-outline mt-1">
              {itemCount} of {limit.maxItems} items used
            </p>
          </div>
        )}

        <SettingsClient
          currentTier={tier}
          hasCustomer={!!user.stripeCustomerId}
          stripePrices={stripePrices}
        />
      </section>
    </div>
  );
}
