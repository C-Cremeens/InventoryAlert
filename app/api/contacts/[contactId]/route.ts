import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getEffectiveRecipientEmails,
  isProTier,
  normalizeContactInput,
  refreshItemAlertEmailMirrors,
} from "@/lib/alert-recipients";
import { updateAlertContactSchema } from "@/lib/validations/contact";

type Params = { params: Promise<{ contactId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!isProTier(session.user.tier)) {
      return NextResponse.json(
        { error: "Contacts are a Pro feature.", code: "PRO_FEATURE_REQUIRED" },
        { status: 403 }
      );
    }

    const { contactId } = await params;
    const existing = await prisma.alertContact.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        userId: true,
        itemRecipients: {
          select: {
            itemId: true,
          },
        },
      },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateAlertContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const normalized = normalizeContactInput({
      name: parsed.data.name ?? "",
      email: parsed.data.email ?? "",
      cellPhone: parsed.data.cellPhone,
      emailEnabled: parsed.data.emailEnabled,
      smsOptIn: parsed.data.smsOptIn,
    });

    const data = {
      ...(parsed.data.name !== undefined && { name: normalized.name }),
      ...(parsed.data.email !== undefined && {
        email: normalized.email,
        emailNormalized: normalized.emailNormalized,
      }),
      ...(parsed.data.cellPhone !== undefined && { cellPhone: normalized.cellPhone }),
      ...(parsed.data.emailEnabled !== undefined && { emailEnabled: normalized.emailEnabled }),
      ...(parsed.data.smsOptIn !== undefined && { smsOptIn: normalized.smsOptIn }),
    };

    const updated = await prisma.$transaction(async (tx) => {
      const contact = await tx.alertContact.update({
        where: { id: contactId },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          cellPhone: true,
          emailEnabled: true,
          smsOptIn: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await refreshItemAlertEmailMirrors(
        tx,
        existing.itemRecipients.map((recipient) => recipient.itemId)
      );

      return contact;
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A contact with this email already exists." },
        { status: 409 }
      );
    }

    console.error("[PATCH /api/contacts/[contactId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!isProTier(session.user.tier)) {
      return NextResponse.json(
        { error: "Contacts are a Pro feature.", code: "PRO_FEATURE_REQUIRED" },
        { status: 403 }
      );
    }

    const { contactId } = await params;
    const existing = await prisma.alertContact.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        userId: true,
        itemRecipients: {
          select: {
            itemId: true,
          },
        },
      },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const impactedItemIds = existing.itemRecipients.map((recipient) => recipient.itemId);
    const impactedItems = impactedItemIds.length
      ? await prisma.inventoryItem.findMany({
          where: {
            id: { in: impactedItemIds },
            alertEmailEnabled: true,
          },
          select: {
            id: true,
            name: true,
            alertRecipients: {
              orderBy: { position: "asc" },
              select: {
                kind: true,
                contactId: true,
                inlineEmail: true,
                contact: {
                  select: {
                    id: true,
                    email: true,
                    emailEnabled: true,
                  },
                },
              },
            },
          },
        })
      : [];

    const blockingItems = impactedItems.filter((item) => {
      const remainingRecipients = item.alertRecipients.filter(
        (recipient) => recipient.contact?.id !== contactId
      );
      return getEffectiveRecipientEmails(remainingRecipients).length === 0;
    });

    if (blockingItems.length > 0) {
      return NextResponse.json(
        {
          error:
            blockingItems.length === 1
              ? `Cannot delete this contact because "${blockingItems[0].name}" would have no remaining recipients.`
              : `Cannot delete this contact because ${blockingItems.length} items would have no remaining recipients.`,
        },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.alertContact.delete({
        where: { id: contactId },
      });

      await refreshItemAlertEmailMirrors(tx, impactedItemIds);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/contacts/[contactId]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
