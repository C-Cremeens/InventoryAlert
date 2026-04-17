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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface font-headline">Inventory</h1>
          {limit.maxItems !== Infinity && (
            <p className="text-sm text-on-surface-variant mt-0.5">
              {items.length} / {limit.maxItems} items used
            </p>
          )}
        </div>
        {atLimit ? (
          <Link
            href="/settings"
            className="w-full sm:w-auto text-center bg-secondary text-on-secondary rounded-full px-4 py-2 text-sm font-medium hover:opacity-90 transition-colors"
          >
            Upgrade to add more
          </Link>
        ) : (
          <Link
            href="/items/new"
            className="w-full sm:w-auto text-center bg-primary text-on-primary rounded-full px-4 py-2 text-sm font-medium hover:bg-primary-container transition-colors"
          >
            + New item
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant">
          <p className="text-lg font-medium text-on-surface mb-2">
            No items yet
          </p>
          <p className="text-sm mb-6">
            Create your first inventory item to get a QR code label.
          </p>
          <Link
            href="/items/new"
            className="bg-primary text-on-primary rounded-full px-4 py-2 text-sm font-medium hover:bg-primary-container transition-colors"
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
