import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { updateItemSchema } from "@/lib/validations/item";
import {
  RecipientConfigError,
  refreshItemAlertEmailMirrors,
  resolveRecipientWritePayload,
} from "@/lib/alert-recipients";

type Params = { params: Promise<{ itemId: string }> };

async function getOwnedItem(itemId: string, userId: string) {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: itemId },
    include: {
      alertRecipients: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          kind: true,
          contactId: true,
          inlineEmail: true,
          position: true,
          contact: {
            select: {
              id: true,
              name: true,
              email: true,
              cellPhone: true,
              emailEnabled: true,
              smsOptIn: true,
            },
          },
        },
      },
    },
  });
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
  try {
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

    const { labelLayout, alertRecipients, alertEmail, ...rest } = parsed.data;
    const scanAcknowledgement = rest.scanAcknowledgement?.trim();

    if (session.user.tier !== "PRO") {
      const hasCustomCooldown =
        rest.scanCooldownMinutes !== undefined && rest.scanCooldownMinutes !== 60;
      const hasCustomAcknowledgement = !!scanAcknowledgement;

      if (hasCustomCooldown || hasCustomAcknowledgement) {
        return NextResponse.json(
          {
            error: "Custom scan timeout and acknowledgement are Pro features.",
            code: "PRO_FEATURE_REQUIRED",
          },
          { status: 403 }
        );
      }
    }

    const hasComplexProRecipients =
      existing.alertRecipients.length !== 1 ||
      existing.alertRecipients[0]?.kind !== "INLINE_EMAIL";
    const shouldReplaceRecipients =
      alertRecipients !== undefined ||
      (alertEmail !== undefined && (!hasComplexProRecipients || session.user.tier === "PRO")) ||
      (session.user.tier !== "PRO" && !hasComplexProRecipients);

    if (session.user.tier !== "PRO" && hasComplexProRecipients) {
      if (alertRecipients !== undefined || alertEmail !== undefined) {
        return NextResponse.json(
          {
            error: "Multi-recipient alerts are a Pro feature. Upgrade to edit this item's recipients.",
            code: "PRO_FEATURE_REQUIRED",
          },
          { status: 403 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      let primaryAlertEmail = existing.alertEmail;

      if (shouldReplaceRecipients) {
        const resolvedRecipients = await resolveRecipientWritePayload({
          tx,
          userId: session.user.id,
          tier: session.user.tier,
          alertEmail,
          alertRecipients,
          fallbackAlertEmail: existing.alertEmail,
        });

        const nextAlertsEnabled = rest.alertEmailEnabled ?? existing.alertEmailEnabled;
        if (nextAlertsEnabled && resolvedRecipients.effectiveRecipientCount === 0) {
          throw new RecipientConfigError(
            "At least one email-enabled recipient is required while alerts are enabled."
          );
        }

        primaryAlertEmail = resolvedRecipients.primaryAlertEmail;

        await tx.inventoryItemRecipient.deleteMany({
          where: { itemId },
        });

        await tx.inventoryItemRecipient.createMany({
          data: resolvedRecipients.recipients.map((recipient) => ({
            ...recipient,
            itemId,
          })),
        });
      }

      const updatedItem = await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          ...rest,
          ...(shouldReplaceRecipients && { alertEmail: primaryAlertEmail }),
          imageUrl: rest.imageUrl !== undefined ? rest.imageUrl || null : undefined,
          ...(rest.scanAcknowledgement !== undefined && {
            scanAcknowledgement: scanAcknowledgement || null,
          }),
          ...(labelLayout !== undefined && {
            labelLayout: labelLayout === null ? Prisma.JsonNull : labelLayout,
          }),
        },
      });

      if (!shouldReplaceRecipients && rest.alertEmailEnabled !== undefined) {
        await refreshItemAlertEmailMirrors(tx, [itemId]);
      }

      return updatedItem;
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof RecipientConfigError) {
      return NextResponse.json(
        { error: err.message, ...(err.code ? { code: err.code } : {}) },
        { status: err.status }
      );
    }

    console.error("[PATCH /api/items/[itemId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
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
