import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ItemForm from "@/components/items/ItemForm";
import QRCodeDisplay from "@/components/items/QRCodeDisplay";
import Link from "next/link";

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

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-on-surface font-headline">Edit Item</h1>
        <Link
          href={`/items/${item.id}/print`}
          target="_blank"
          className="w-full sm:w-auto text-center border border-outline text-on-surface rounded-full px-4 py-2 text-sm hover:bg-surface-container-low transition-colors"
        >
          Print label
        </Link>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-5 flex flex-col items-center mb-6 shadow-sm">
        <p className="text-xs text-on-surface-variant mb-3">QR Code</p>
        <QRCodeDisplay qrCodeId={item.qrCodeId} size={180} />
        <p className="text-xs text-outline mt-3 break-all text-center">
          {process.env.NEXT_PUBLIC_BASE_URL}/scan/{item.qrCodeId}
        </p>
      </div>

      <ItemForm item={item} mode="edit" />
    </div>
  );
}
