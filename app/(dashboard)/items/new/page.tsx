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
        <h1 className="text-2xl font-bold text-on-surface font-headline mb-6">New Item</h1>
        <div className="bg-error-container rounded-xl p-6 text-center">
          <p className="font-semibold text-on-error-container mb-2">Item limit reached</p>
          <p className="text-sm text-on-error-container mb-4">
            Your {limit.label} plan allows up to {limit.maxItems} items. You
            have {count}.
          </p>
          <Link
            href="/settings"
            className="inline-block bg-error text-on-error rounded-full px-5 py-2 text-sm font-medium hover:opacity-90 transition-colors"
          >
            Upgrade plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-on-surface font-headline mb-6">New Item</h1>
      <ItemForm mode="create" currentTier={session.user.tier} />
    </div>
  );
}
