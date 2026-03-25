import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateItemSchema } from "@/lib/validations/item";

type Params = { params: Promise<{ itemId: string }> };

async function getOwnedItem(itemId: string, userId: string) {
  const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
  if (!item || item.userId !== userId) return null;
  return item;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const item = await getOwnedItem(itemId, session.user.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const existing = await getOwnedItem(itemId, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const updated = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      ...parsed.data,
      imageUrl: parsed.data.imageUrl !== undefined
        ? parsed.data.imageUrl || null
        : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { itemId } = await params;
  const existing = await getOwnedItem(itemId, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.inventoryItem.delete({ where: { id: itemId } });

  return NextResponse.json({ ok: true });
}
