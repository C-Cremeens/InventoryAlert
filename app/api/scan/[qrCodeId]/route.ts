import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/resend";
import { sendStockingPushNotification } from "@/lib/push";
import { getEffectiveRecipientEmails } from "@/lib/alert-recipients";

type Params = { params: Promise<{ qrCodeId: string }> };

async function notifyStockingRequestCreated(args: {
  userId: string;
  itemId: string;
  itemName: string;
  requestId: string;
  createdAt: Date;
  emailSent: boolean;
}) {
  try {
    await sendStockingPushNotification({
      userId: args.userId,
      itemName: args.itemName,
      requestId: args.requestId,
    });
  } catch (err) {
    console.error("Failed sending stocking push notification", err);
  }
}

export async function POST(_req: NextRequest, { params }: Params) {
  const { qrCodeId } = await params;

  const item = await prisma.inventoryItem.findUnique({
    where: { qrCodeId },
    include: {
      alertRecipients: {
        orderBy: { position: "asc" },
        select: {
          kind: true,
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
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const scanAcknowledgement = item.scanAcknowledgement?.trim();
  const defaultAcknowledgements = {
    sent: "A low stock alert has been sent to the responsible team member. Thank you!",
    alreadyNotified:
      "Staff have already been notified about this item recently. No additional alert was sent.",
  };

  if (item.alertEmailEnabled === false) {
    const request = await prisma.stockingRequest.create({
      data: { itemId: item.id, emailSent: false },
    });

    void notifyStockingRequestCreated({
      userId: item.userId,
      itemId: item.id,
      itemName: item.name,
      requestId: request.id,
      createdAt: request.createdAt,
      emailSent: request.emailSent,
    });

    return NextResponse.json({
      alreadyNotified: false,
      itemName: item.name,
      acknowledgementMessage: scanAcknowledgement || defaultAcknowledgements.sent,
      emailFailed: false,
    });
  }

  const effectiveRecipientEmails = getEffectiveRecipientEmails(item.alertRecipients);

  if (effectiveRecipientEmails.length === 0) {
    const request = await prisma.stockingRequest.create({
      data: { itemId: item.id, emailSent: false },
    });

    void notifyStockingRequestCreated({
      userId: item.userId,
      itemId: item.id,
      itemName: item.name,
      requestId: request.id,
      createdAt: request.createdAt,
      emailSent: request.emailSent,
    });

    console.error(
      `[POST /api/scan/${qrCodeId}] Item "${item.id}" has no effective alert recipients configured.`
    );

    return NextResponse.json({
      alreadyNotified: false,
      itemName: item.name,
      acknowledgementMessage: scanAcknowledgement || defaultAcknowledgements.sent,
    });
  }

  // Check for a recent email-sent request within this item's configured cooldown window
  const cooldownMinutes = item.scanCooldownMinutes ?? 60;
  const cooldownCutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000);
  const recentEmailSent = await prisma.stockingRequest.findFirst({
    where: {
      itemId: item.id,
      emailSent: true,
      createdAt: { gte: cooldownCutoff },
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentEmailSent) {
    const request = await prisma.stockingRequest.create({
      data: { itemId: item.id, emailSent: false },
    });

    void notifyStockingRequestCreated({
      userId: item.userId,
      itemId: item.id,
      itemName: item.name,
      requestId: request.id,
      createdAt: request.createdAt,
      emailSent: request.emailSent,
    });

    return NextResponse.json({
      alreadyNotified: true,
      itemName: item.name,
      acknowledgementMessage:
        scanAcknowledgement || defaultAcknowledgements.alreadyNotified,
      emailFailed: false,
    });
  }

  const request = await prisma.stockingRequest.create({
    data: { itemId: item.id, emailSent: true },
  });

  void notifyStockingRequestCreated({
    userId: item.userId,
    itemId: item.id,
    itemName: item.name,
    requestId: request.id,
    createdAt: request.createdAt,
    emailSent: request.emailSent,
  });

  let emailFailed = false;
  try {
    await sendAlertEmail(effectiveRecipientEmails, item.name);
  } catch (err) {
    console.error("Failed to send alert email:", err);
    emailFailed = true;
    // The cooldown window only counts emailSent:true requests — flip this one
    // back so the next scan retries the alert instead of being suppressed for
    // the full cooldown with no email ever delivered.
    try {
      await prisma.stockingRequest.update({
        where: { id: request.id },
        data: { emailSent: false },
      });
    } catch (updateErr) {
      console.error("Failed to reset emailSent after send failure:", updateErr);
    }
  }

  return NextResponse.json({
    alreadyNotified: false,
    itemName: item.name,
    acknowledgementMessage: scanAcknowledgement || defaultAcknowledgements.sent,
    emailFailed,
  });
}
