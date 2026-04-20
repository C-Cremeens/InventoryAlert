import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createItemSchema } from "@/lib/validations/item";
import { canCreateItem } from "@/lib/tier";
import {
  RecipientConfigError,
  resolveRecipientWritePayload,
} from "@/lib/alert-recipients";

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
  try {
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

    const scanAcknowledgement = parsed.data.scanAcknowledgement?.trim();
    const scanCooldownMinutes = parsed.data.scanCooldownMinutes ?? 60;
    const requestingProScanControls =
      scanCooldownMinutes !== 60 || !!scanAcknowledgement;

    if (requestingProScanControls && session.user.tier !== "PRO") {
      return NextResponse.json(
        {
          error: "Custom scan timeout and acknowledgement are Pro features.",
          code: "PRO_FEATURE_REQUIRED",
        },
        { status: 403 }
      );
    }

    const item = await prisma.$transaction(async (tx) => {
      const resolvedRecipients = await resolveRecipientWritePayload({
        tx,
        userId: session.user.id,
        tier: session.user.tier,
        alertEmail: parsed.data.alertEmail,
        alertRecipients: parsed.data.alertRecipients,
      });

      const alertsEnabled = parsed.data.alertEmailEnabled ?? true;
      if (alertsEnabled && resolvedRecipients.effectiveRecipientCount === 0) {
        throw new RecipientConfigError(
          "At least one email-enabled recipient is required while alerts are enabled."
        );
      }

      const createdItem = await tx.inventoryItem.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          imageUrl: parsed.data.imageUrl || null,
          alertEmail: resolvedRecipients.primaryAlertEmail,
          lowStockThreshold: parsed.data.lowStockThreshold,
          alertEmailEnabled: parsed.data.alertEmailEnabled,
          scanCooldownMinutes: session.user.tier === "PRO" ? scanCooldownMinutes : 60,
          scanAcknowledgement: session.user.tier === "PRO" ? scanAcknowledgement || null : null,
          userId: session.user.id,
        },
      });

      await tx.inventoryItemRecipient.createMany({
        data: resolvedRecipients.recipients.map((recipient) => ({
          ...recipient,
          itemId: createdItem.id,
        })),
      });

      return createdItem;
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    if (err instanceof RecipientConfigError) {
      return NextResponse.json(
        { error: err.message, ...(err.code ? { code: err.code } : {}) },
        { status: err.status }
      );
    }
    console.error("[POST /api/items]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
