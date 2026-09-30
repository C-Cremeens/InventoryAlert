import { prisma } from "@/lib/prisma";
import { confirmedEmails } from "@/lib/recipient-consent";
import { isPushConfigured } from "@/lib/push";
export async function recordScan(qrCodeId: string, submissionKey: string) {
  return prisma.$transaction(async (tx) => {
    // A row lock makes cooldown and request/job creation one atomic decision.
    await tx.$queryRaw`SELECT "id" FROM "InventoryItem" WHERE "qrCodeId" = ${qrCodeId} FOR UPDATE`;
    const item = await tx.inventoryItem.findUnique({
      where: { qrCodeId },
      include: {
        user: true,
        alertRecipients: {
          orderBy: { position: "asc" },
          include: { contact: true },
        },
      },
    });
    if (!item) return null;
    const existing = await tx.stockingRequest.findUnique({
      where: { itemId_submissionKey: { itemId: item.id, submissionKey } },
    });
    if (existing)
      return {
        requestId: existing.id,
        created: false,
        message: "Your report was already recorded. Thank you.",
      };
    const cooldown =
      (item.user.tier === "PRO" ? item.scanCooldownMinutes : 60) * 60_000;
    if (
      item.lastAlertAt &&
      Date.now() - item.lastAlertAt.getTime() < cooldown
    ) {
      return {
        created: false,
        requestId: null,
        message:
          "A recent report is already recorded for this item. No duplicate report was added.",
      };
    }
    const recipients =
      item.alertEmailEnabled && item.user.termsAcceptedAt
        ? await confirmedEmails(tx, item)
        : [];
    const subscriptions =
      item.user.emailVerifiedAt &&
      item.user.termsAcceptedAt &&
      isPushConfigured()
        ? await tx.pushSubscription.findMany({
            where: { userId: item.userId },
            take: 20,
            select: { id: true },
          })
        : [];
    const request = await tx.stockingRequest.create({
      data: {
        itemId: item.id,
        submissionKey,
        notifications: {
          create: [
            ...recipients.map((recipient) => ({
              kind: "EMAIL" as const,
              itemName: item.name,
              recipient,
            })),
            ...subscriptions.map((sub) => ({
              kind: "PUSH" as const,
              itemName: item.name,
              recipient: sub.id,
            })),
          ],
        },
      },
    });
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { lastAlertAt: new Date() },
    });
    const queued = recipients.length + subscriptions.length > 0;
    return {
      requestId: request.id,
      created: true,
      acknowledgement:
        item.user.tier === "PRO" ? item.scanAcknowledgement : null,
      message: queued
        ? "Your low-stock report was recorded and notifications are queued. Thank you!"
        : "Your low-stock report was recorded. Notifications are not available for this item; please notify staff directly.",
    };
  });
}
