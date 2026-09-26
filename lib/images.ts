import { reportError } from "@/lib/monitoring";
import { del } from "@vercel/blob";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lockUser } from "@/lib/security";
import { RecipientConfigError } from "@/lib/alert-recipients";

export function isLegacyOwnedImage(url: string, userId: string) {
  try {
    const parsed = new URL(url);
    const host = process.env.BLOB_PUBLIC_HOSTNAME;
    return (
      !!host &&
      /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(host) &&
      parsed.protocol === "https:" &&
      parsed.host === host &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash &&
      parsed.pathname.startsWith(`/items/${encodeURIComponent(userId)}/`)
    );
  } catch {
    return false;
  }
}

// Call while holding the owner's transaction lock. A deleting asset cannot be reused.
export async function requireOwnedImage(
  tx: Prisma.TransactionClient,
  url: string | null | undefined,
  userId: string,
) {
  if (!url) return;
  let asset = await tx.storedImage.findUnique({ where: { url } });
  if (!asset && isLegacyOwnedImage(url, userId)) {
    asset = await tx.storedImage.create({ data: { url, userId } });
  }
  if (!asset || asset.userId !== userId || asset.deleting) {
    throw new RecipientConfigError(
      "Please upload an image from your account.",
      400,
    );
  }
}

export async function deleteUnusedImage(url: string, userId: string) {
  const reserved = await prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    let asset = await tx.storedImage.findUnique({ where: { url } });
    if (!asset && isLegacyOwnedImage(url, userId))
      asset = await tx.storedImage.create({ data: { url, userId } });
    if (!asset || asset.userId !== userId) return false;
    if (await tx.inventoryItem.count({ where: { imageUrl: url } }))
      return false;
    await tx.storedImage.update({ where: { url }, data: { deleting: true } });
    return true;
  });
  if (!reserved) return;
  // Leave the deleting row in place if provider cleanup fails. Maintenance retries it.
  await del(url);
  await prisma.storedImage.deleteMany({
    where: { url, userId, deleting: true },
  });
}

export async function cleanOrphanedImages() {
  const assets = await prisma.$queryRaw<Array<{ url: string; userId: string }>>`
    SELECT s."url", s."userId" FROM "StoredImage" s
    WHERE (s."deleting" OR s."createdAt" < ${new Date(Date.now() - 86400_000)})
      AND NOT EXISTS (SELECT 1 FROM "InventoryItem" i WHERE i."imageUrl" = s."url")
    ORDER BY s."createdAt" ASC LIMIT 50`;
  for (const asset of assets) {
    try {
      await deleteUnusedImage(asset.url, asset.userId);
    } catch (error) {
      reportError("Image cleanup failed", error);
    }
  }
}
