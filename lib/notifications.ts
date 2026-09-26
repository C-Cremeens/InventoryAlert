import { reportError } from "@/lib/monitoring";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendAlertEmail } from "@/lib/resend";
import { sendPush } from "@/lib/push";
import { confirmedEmails } from "@/lib/recipient-consent";

const MAX_ATTEMPTS = 5;
// Retry within the provider's 24-hour idempotency retention; fail visibly after that.
const MAX_AGE = 20 * 3600_000;
const LEASE_MS = 5 * 60_000;
export async function processNotification(id: string) {
  const now = new Date();
  const leaseToken = crypto.randomUUID();
  const claimed = await prisma.notificationJob.updateMany({
    where: {
      id,
      OR: [
        { status: "PENDING", nextAttemptAt: { lte: now } },
        { status: "PROCESSING", lockedUntil: { lt: now } },
      ],
    },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
      lockedUntil: new Date(now.getTime() + LEASE_MS),
      leaseToken,
    },
  });
  if (!claimed.count) return;
  const job = await prisma.notificationJob.findUnique({
    where: { id },
    include: {
      request: {
        include: {
          item: {
            include: {
              user: true,
              alertRecipients: {
                orderBy: { position: "asc" },
                include: { contact: true },
              },
            },
          },
        },
      },
    },
  });
  if (!job) return;
  const finish = async (
    status: "SENT" | "FAILED" | "SKIPPED",
    providerId?: string,
    lastError?: string,
  ) => {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.notificationJob.updateMany({
        where: { id, leaseToken },
        data: {
          status,
          providerId,
          lastError,
          lockedUntil: null,
          leaseToken: null,
        },
      });
      if (updated.count && status === "SENT" && job.kind === "EMAIL")
        await tx.stockingRequest.update({
          where: { id: job.requestId },
          data: { emailSent: true },
        });
    });
  };
  if (
    job.attempts > MAX_ATTEMPTS ||
    Date.now() - job.createdAt.getTime() > MAX_AGE
  ) {
    await finish(
      "FAILED",
      undefined,
      "Retry window exhausted; manual review required.",
    );
    return;
  }
  try {
    const item = job.request.item;
    if (!item.user.emailVerifiedAt || !item.user.termsAcceptedAt) {
      await finish("SKIPPED");
      return;
    }
    if (job.kind === "EMAIL") {
      const recipients = await confirmedEmails(prisma, item);
      if (!item.alertEmailEnabled || !recipients.includes(job.recipient)) {
        await finish("SKIPPED");
        return;
      }
      const providerId = await sendAlertEmail(
        job.recipient,
        job.itemName,
        `inventory-alert/${job.id}`,
      );
      await finish("SENT", providerId);
    } else {
      const sent = await sendPush(
        job.recipient,
        item.userId,
        job.itemName,
        job.requestId,
      );
      await finish(sent ? "SENT" : "SKIPPED");
    }
  } catch (error) {
    reportError("Notification attempt failed", error);
    await prisma.notificationJob.updateMany({
      where: { id, leaseToken },
      data: {
        status: job.attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
        nextAttemptAt: new Date(
          Date.now() + Math.min(3600, 60 * 2 ** job.attempts) * 1000,
        ),
        lockedUntil: null,
        leaseToken: null,
        lastError:
          "Provider delivery attempt failed; see server error monitoring.",
      },
    });
  }
}

export async function drainNotifications(requestId?: string) {
  const now = new Date();
  const jobs = await prisma.notificationJob.findMany({
    where: {
      ...(requestId ? { requestId } : {}),
      OR: [
        { status: "PENDING", nextAttemptAt: { lte: now } },
        { status: "PROCESSING", lockedUntil: { lt: now } },
      ],
    },
    orderBy: { nextAttemptAt: "asc" },
    take: 20,
    select: { id: true },
  });
  // At most five external requests at a time. A crashed worker's lease expires.
  for (let i = 0; i < jobs.length; i += 5)
    await Promise.all(
      jobs.slice(i, i + 5).map((job) => processNotification(job.id)),
    );
  return jobs.length;
}
