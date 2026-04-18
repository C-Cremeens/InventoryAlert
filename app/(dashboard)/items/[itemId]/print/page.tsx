import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TIER_LIMITS } from "@/lib/tier";
import PrintPageClient from "./PrintPageClient";

export default async function PrintPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const session = await auth();
  if (!session) return null;

  const { itemId } = await params;
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });

  if (!item || item.userId !== session.user.id) notFound();

  const canCustomizeLabels = TIER_LIMITS[session.user.tier].customLabels;

  return (
    <PrintPageClient
      itemId={item.id}
      itemName={item.name}
      qrCodeId={item.qrCodeId}
      description={item.description}
      lowStockThreshold={null}
      canCustomizeLabels={canCustomizeLabels}
    />
  );
}
