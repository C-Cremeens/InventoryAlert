import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateRequestStatusSchema } from "@/lib/validations/request";

type Params = { params: Promise<{ requestId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId } = await params;

  const request = await prisma.stockingRequest.findUnique({
    where: { id: requestId },
    include: { item: { select: { userId: true } } },
  });

  if (!request || request.item.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateRequestStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const updated = await prisma.stockingRequest.update({
    where: { id: requestId },
    data: { status: parsed.data.status },
  });

  return NextResponse.json(updated);
}
