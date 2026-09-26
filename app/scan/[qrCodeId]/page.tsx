import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { z } from "zod";
import ReportButton from "./ReportButton";
export default async function ScanPage({
  params,
}: {
  params: Promise<{ qrCodeId: string }>;
}) {
  const { qrCodeId } = await params;
  if (!z.uuid().safeParse(qrCodeId).success) notFound();
  const item = await prisma.inventoryItem.findUnique({
    where: { qrCodeId },
    select: { name: true },
  });
  if (!item) notFound();
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-900">
        <h1 className="text-xl font-bold">{item.name}</h1>
        <p>Running low? Let the team know this item needs attention.</p>
        <ReportButton qrCodeId={qrCodeId} />
      </div>
    </main>
  );
}
