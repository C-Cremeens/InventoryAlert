import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TIER_LIMITS, canCreateItem } from "@/lib/tier";
import ItemForm from "@/components/items/ItemForm";
import Link from "next/link";

export default async function NewItemPage() {
  const session = await auth();
  if (!session) return null;

  const count = await prisma.inventoryItem.count({
    where: { userId: session.user.id },
  });

  const allowed = canCreateItem(session.user.tier, count);

  if (!allowed) {
    const limit = TIER_LIMITS[session.user.tier];
    return (
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Item</h1>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
          <p className="font-semibold text-gray-900 mb-2">Item limit reached</p>
          <p className="text-sm text-gray-600 mb-4">
            Your {limit.label} plan allows up to {limit.maxItems} items. You
            have {count}.
          </p>
          <Link
            href="/settings"
            className="inline-block bg-orange-500 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-orange-600 transition-colors"
          >
            Upgrade plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Item</h1>
      <ItemForm mode="create" />
    </div>
  );
}
