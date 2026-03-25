import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RequestsClient from "./RequestsClient";
import type { RequestStatus } from "@prisma/client";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session) return null;

  const { status: statusParam } = await searchParams;
  const validStatuses: RequestStatus[] = ["PENDING", "APPROVED", "DECLINED"];
  const status =
    statusParam && validStatuses.includes(statusParam as RequestStatus)
      ? (statusParam as RequestStatus)
      : undefined;

  const requests = await prisma.stockingRequest.findMany({
    where: {
      item: { userId: session.user.id },
      ...(status ? { status } : {}),
    },
    include: { item: { select: { name: true, id: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Stocking Requests</h1>
      <RequestsClient
        initialRequests={requests}
        activeStatus={status ?? null}
      />
    </div>
  );
}
