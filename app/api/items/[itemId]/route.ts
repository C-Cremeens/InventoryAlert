import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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

  const { labelLayout, ...rest } = parsed.data;
  const updated = await prisma.inventoryItem.update({
    where: { id: itemId },
    data: {
      ...rest,
      imageUrl: rest.imageUrl !== undefined ? rest.imageUrl || null : undefined,
      // Prisma requires Prisma.JsonNull instead of plain null for nullable JSON fields
      ...(labelLayout !== undefined && {
        labelLayout: labelLayout === null ? Prisma.JsonNull : labelLayout,
      }),
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

  if (existing.imageUrl) {
    try {
      await del(existing.imageUrl);
    } catch (err) {
      console.error("Failed to delete blob image:", err);
    }
  }

  await prisma.inventoryItem.delete({ where: { id: itemId } });

  if (existing.imageUrl) {
    await del(existing.imageUrl);
  }

  return NextResponse.json({ ok: true });
}
