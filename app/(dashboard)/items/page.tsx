import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TIER_LIMITS } from "@/lib/tier";
import ItemCard from "@/components/items/ItemCard";
import ItemsSearch from "@/components/items/ItemsSearch";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const session = await auth();
  if (!session) return null;

  const { search: searchParam } = await searchParams;
  const search = searchParam?.trim().slice(0, 100) || undefined;

  const [items, totalCount] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: {
        userId: session.user.id,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
    search
      ? prisma.inventoryItem.count({ where: { userId: session.user.id } })
      : Promise.resolve(0),
  ]);

  const count = search ? totalCount : items.length;
  const tier = session.user.tier;
  const limit = TIER_LIMITS[tier];
  const atLimit = limit.maxItems !== Infinity && count >= limit.maxItems;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          {limit.maxItems !== Infinity && (
            <p className="text-sm text-gray-500 mt-0.5">
              {count} / {limit.maxItems} items used
            </p>
          )}
        </div>
        {atLimit ? (
          <Link
            href="/settings"
            className="w-full sm:w-auto text-center bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Upgrade to add more
          </Link>
        ) : (
          <Link
            href="/items/new"
            className="w-full sm:w-auto text-center bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New item
          </Link>
        )}
      </div>

      <ItemsSearch />

      {items.length === 0 ? (
        search ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg font-medium text-gray-700 mb-2">
              No items match your search
            </p>
            <Link
              href="/items"
              className="text-sm text-blue-600 hover:underline"
            >
              Clear search
            </Link>
          </div>
        ) : (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg font-medium text-gray-700 mb-2">
              No items yet
            </p>
            <p className="text-sm mb-6">
              Create your first inventory item to get a QR code label.
            </p>
            <Link
              href="/items/new"
              className="bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Create first item
            </Link>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
