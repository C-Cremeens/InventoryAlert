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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Item</h1>
        <Link
          href={`/items/${item.id}/print`}
          target="_blank"
          className="border border-gray-300 text-gray-700 rounded-lg px-4 py-1.5 text-sm hover:bg-gray-50 transition-colors"
        >
          Print label
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col items-center mb-6">
        <p className="text-xs text-gray-500 mb-3">QR Code</p>
        <QRCodeDisplay qrCodeId={item.qrCodeId} size={180} />
        <p className="text-xs text-gray-400 mt-3 break-all text-center">
          {process.env.NEXT_PUBLIC_BASE_URL}/scan/{item.qrCodeId}
        </p>
      </div>

      <ItemForm item={item} mode="edit" />
    </div>
  );
}
