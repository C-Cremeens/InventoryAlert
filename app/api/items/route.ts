import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createItemSchema } from "@/lib/validations/item";
import { canCreateItem } from "@/lib/tier";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.inventoryItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const count = await prisma.inventoryItem.count({
    where: { userId: session.user.id },
  });

  if (!canCreateItem(session.user.tier, count)) {
    return NextResponse.json(
      {
        error: "Item limit reached for your current plan. Please upgrade to add more items.",
        code: "TIER_LIMIT",
      },
      { status: 403 }
    );
  }

  const item = await prisma.inventoryItem.create({
    data: {
      ...parsed.data,
      imageUrl: parsed.data.imageUrl || null,
      userId: session.user.id,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
