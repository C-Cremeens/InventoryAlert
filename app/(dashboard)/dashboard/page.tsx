import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import TierBadge from "@/components/layout/TierBadge";
import { TIER_LIMITS } from "@/lib/tier";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const [itemCount, pendingRequests, recentRequests] = await Promise.all([
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
  ]);

  const tier = session.user.tier;
  const limit = TIER_LIMITS[tier];
  const atLimit = limit.maxItems !== Infinity && itemCount >= limit.maxItems;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <TierBadge tier={tier} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
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
          sub={limit.price}
          href="/settings"
        />
      </div>

      {/* Recent stocking requests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Recent Stocking Requests
          </h2>
          <Link
            href="/requests"
            className="text-sm text-blue-600 hover:underline"
          >
            View all
          </Link>
        </div>
        {recentRequests.length === 0 ? (
          <div className="text-sm text-gray-500 bg-white border border-gray-200 rounded-xl px-5 py-8 text-center">
            No stocking requests yet. When a QR code is scanned, requests will
            appear here.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-600">Item</th>
                  <th className="px-4 py-3 font-medium text-gray-600">When</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRequests.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {r.item.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
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
      className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-200 transition-colors"
    >
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-50 text-yellow-700",
    APPROVED: "bg-green-50 text-green-700",
    DECLINED: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        styles[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
