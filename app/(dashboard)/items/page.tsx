import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TIER_LIMITS } from "@/lib/tier";
import ItemCard from "@/components/items/ItemCard";

export default async function ItemsPage() {
  const session = await auth();
  if (!session) return null;

  const items = await prisma.inventoryItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const tier = session.user.tier;
  const limit = TIER_LIMITS[tier];
  const atLimit = limit.maxItems !== Infinity && items.length >= limit.maxItems;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          {limit.maxItems !== Infinity && (
            <p className="text-sm text-gray-500 mt-0.5">
              {items.length} / {limit.maxItems} items used
            </p>
          )}
        </div>
        {atLimit ? (
          <Link
            href="/settings"
            className="bg-orange-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Upgrade to add more
          </Link>
        ) : (
          <Link
            href="/items/new"
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New item
          </Link>
        )}
      </div>

      {items.length === 0 ? (
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
