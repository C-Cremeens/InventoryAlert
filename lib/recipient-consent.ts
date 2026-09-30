import type { Prisma, Tier } from "@prisma/client";
import {
  getEffectiveRecipientEmails,
  normalizeEmail,
} from "@/lib/alert-recipients";

type Item = {
  alertRecipients: Parameters<typeof getEffectiveRecipientEmails>[0];
  user: { id: string; email: string; emailVerifiedAt: Date | null; tier: Tier };
};
export function eligibleEmails(item: Item) {
  if (!item.user.emailVerifiedAt) return [];
  const emails = getEffectiveRecipientEmails(item.alertRecipients).map(
    normalizeEmail,
  );
  // Preserve configured data on downgrade; only the first recipient remains active.
  return item.user.tier === "PRO" ? emails : emails.slice(0, 1);
}

export async function confirmedEmails(
  tx: Prisma.TransactionClient,
  item: Item,
) {
  const eligible = eligibleEmails(item);
  const consents = await tx.recipientConsent.findMany({
    where: {
      userId: item.user.id,
      email: { in: eligible },
      verifiedAt: { not: null },
    },
    select: { email: true },
  });
  const confirmed = new Set(consents.map((c) => c.email));
  if (item.user.emailVerifiedAt) confirmed.add(normalizeEmail(item.user.email));
  return eligible.filter((email) => confirmed.has(email));
}
