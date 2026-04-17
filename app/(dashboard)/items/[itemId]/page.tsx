import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { TIER_LIMITS } from "@/lib/tier";
import ItemForm from "@/components/items/ItemForm";
import LabelSection from "@/components/print/LabelSection";
import type { LabelLayout, LabelSize, QrPosition } from "@/lib/label";

function parseLabelLayout(raw: unknown): LabelLayout | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const validSizes: LabelSize[] = ["3x1", "2x1", "1x1"];
  const validPositions: QrPosition[] = ["left", "center", "right"];
  if (
    typeof r.size !== "string" || !validSizes.includes(r.size as LabelSize) ||
    typeof r.qrPosition !== "string" || !validPositions.includes(r.qrPosition as QrPosition) ||
    !Array.isArray(r.elements)
  ) {
    return null;
  }
  return { size: r.size as LabelSize, qrPosition: r.qrPosition as QrPosition, elements: r.elements };
}

export default async function EditItemPage({
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
  const savedLayout = parseLabelLayout(item.labelLayout);

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-on-surface font-headline mb-6">Edit Item</h1>

      <LabelSection
        itemId={item.id}
        qrCodeId={item.qrCodeId}
        itemName={item.name}
        description={item.description}
        lowStockThreshold={item.lowStockThreshold}
        savedLayout={savedLayout}
        canCustomizeLabels={canCustomizeLabels}
      />

      <ItemForm item={item} mode="edit" />
    </div>
  );
}
