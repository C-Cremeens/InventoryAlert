import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export function isPushConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  );
}

let vapidSet = false;
function getWebPush() {
  if (!vapidSet) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    vapidSet = true;
  }
  return webpush;
}

export async function sendStockingPushNotification(args: {
  userId: string;
  itemName: string;
  requestId: string;
}) {
  if (!isPushConfigured()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: args.userId },
  });

  if (subscriptions.length === 0) return;

  const wp = getWebPush();
  const payload = JSON.stringify({
    title: "New stocking request",
    body: `${args.itemName} needs attention.`,
    tag: `stocking-${args.requestId}`,
    url: "/requests",
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await wp.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } });
        } else {
          console.error("Push send failed for endpoint", sub.endpoint, err);
        }
      }
    })
  );
}
