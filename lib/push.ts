import { prisma } from "@/lib/prisma";

export function isPushConfigured() {
  return false;
}

export async function sendStockingPushNotification(args: {
  userId: string;
  itemName: string;
  requestId: string;
}) {
  const subscriptionCount = await prisma.pushSubscription.count({ where: { userId: args.userId } });

  if (subscriptionCount > 0) {
    console.info(
      `[push disabled] would send notification for request ${args.requestId} (${args.itemName}) to user ${args.userId}`
    );
  }
}
