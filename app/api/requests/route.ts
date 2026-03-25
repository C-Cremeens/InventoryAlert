import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { RequestStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");

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

  return NextResponse.json(requests);
}
