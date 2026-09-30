import type { RequestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export const PAGE_SIZE = 25;
export function historyQuery(status?: string | null, page?: string | null) {
  return {
    status: ["PENDING", "APPROVED", "DECLINED"].includes(status ?? "")
      ? (status as RequestStatus)
      : undefined,
    page: Math.min(10000, Math.max(1, Number.parseInt(page ?? "1", 10) || 1)),
  };
}
export async function requestHistory(
  userId: string,
  query: ReturnType<typeof historyQuery>,
) {
  const requests = await prisma.stockingRequest.findMany({
    where: {
      item: { userId },
      ...(query.status ? { status: query.status } : {}),
    },
    include: {
      item: { select: { name: true, id: true } },
      notifications: { select: { kind: true, status: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (query.page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  });
  return {
    requests: requests.slice(0, PAGE_SIZE),
    hasMore: requests.length > PAGE_SIZE,
    page: query.page,
  };
}
