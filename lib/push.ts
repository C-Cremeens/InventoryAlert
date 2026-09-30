import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { isPushEndpoint } from "@/lib/push-validation";
export function isPushConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}
export async function sendPush(
  subscriptionId: string,
  userId: string,
  itemName: string,
  requestId: string,
) {
  const sub = await prisma.pushSubscription.findFirst({
    where: { id: subscriptionId, userId },
  });
  if (!sub || !isPushConfigured() || !isPushEndpoint(sub.endpoint))
    return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({
        title: "New stocking request",
        body: `${itemName} needs attention.`,
        tag: `stocking-${requestId}`,
        url: "/requests",
      }),
      { timeout: 10000, TTL: 3600 },
    );
    return true;
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await prisma.pushSubscription.deleteMany({
        where: { id: sub.id, userId },
      });
      return false;
    }
    throw error;
  }
}
