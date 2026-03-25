import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
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

  return (
    <PrintPageClient
      itemId={item.id}
      itemName={item.name}
      qrCodeId={item.qrCodeId}
    />
  );
}
