import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import TierBadge from "@/components/layout/TierBadge";
import { TIER_LIMITS } from "@/lib/tier";
import { fetchStripePrices } from "@/lib/stripe";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const [itemCount, pendingRequests, recentRequests, stripePrices] = await Promise.all([
    prisma.inventoryItem.count({ where: { userId: session.user.id } }),
    prisma.stockingRequest.count({
      where: { item: { userId: session.user.id }, status: "PENDING" },
    }),
    prisma.stockingRequest.findMany({
      where: { item: { userId: session.user.id } },
      include: { item: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    fetchStripePrices(),
  ]);

  const tier = session.user.tier;
  const limit = TIER_LIMITS[tier];
  const currentPrice = tier === "FREE" ? limit.price : stripePrices[tier];
  const atLimit = limit.maxItems !== Infinity && itemCount >= limit.maxItems;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-on-surface font-headline">Dashboard</h1>
        <TierBadge tier={tier} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <HeroStatCard
          label="Inventory Items"
          value={
            limit.maxItems === Infinity
              ? `${itemCount}`
              : `${itemCount} / ${limit.maxItems}`
          }
          sub={atLimit ? "Limit reached — upgrade to add more" : undefined}
          href="/items"
        />
        <StatCard
          label="Pending Requests"
          value={String(pendingRequests)}
          href="/requests"
        />
        <StatCard
          label="Current Plan"
          value={limit.label}
          sub={currentPrice}
          href="/settings"
        />
      </div>

      {/* Recent stocking requests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-on-surface font-headline">
            Recent Stocking Requests
          </h2>
          <Link
            href="/requests"
            className="text-sm text-secondary hover:underline"
          >
            View all
          </Link>
        </div>
        {recentRequests.length === 0 ? (
          <div className="text-sm text-on-surface-variant bg-surface-container-lowest rounded-xl px-5 py-8 text-center">
            No stocking requests yet. When a QR code is scanned, requests will
            appear here.
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
            <ul className="divide-y divide-outline-variant md:hidden">
              {recentRequests.map((r) => (
                <li key={r.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-on-surface truncate">{r.item.name}</p>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {new Date(r.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container text-left">
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Item</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">When</th>
                  <th className="px-4 py-3 font-medium text-on-surface-variant">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-outline-variant last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-on-surface">
                      {r.item.name}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HeroStatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-gradient-to-br from-primary to-primary-container text-white rounded-xl p-5 hover:opacity-90 transition-opacity"
    >
      <p className="text-sm text-white/70 mb-1">{label}</p>
      <p className="text-2xl text-white font-headline font-bold">{value}</p>
      {sub && <p className="text-xs text-white/60 mt-1">{sub}</p>}
    </Link>
  );
}

function StatCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-surface-container-lowest rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
    >
      <p className="text-sm text-on-surface-variant mb-1">{label}</p>
      <p className="text-2xl text-on-surface font-headline font-bold">{value}</p>
      {sub && <p className="text-xs text-on-surface-variant mt-1">{sub}</p>}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-tertiary-fixed/60 text-on-tertiary-container",
    APPROVED: "bg-secondary-container/40 text-on-secondary-container",
    DECLINED: "bg-error-container text-on-error-container",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        styles[status] ?? "bg-surface-container-high text-on-surface-variant"
      }`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
