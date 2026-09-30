import { auth } from "@/lib/auth";
import { put, del } from "@vercel/blob";
import sharp from "sharp";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
const MAX_SIZE = 2 * 1024 * 1024;
export async function POST(req: Request) {
  const session = await auth();
  if (
    !session?.user?.id ||
    !session.user.emailVerifiedAt ||
    !session.user.termsAcceptedAt
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const limit = await checkRateLimit(
    `upload:${session.user.id}`,
    { limit: 30, windowSeconds: 3600 },
    true,
  );
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  if (Number(req.headers.get("content-length")) > MAX_SIZE + 65536)
    return Response.json(
      { error: "File must be under 2 MB." },
      { status: 413 },
    );
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (
    !(file instanceof File) ||
    file.size > MAX_SIZE ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type)
  )
    return Response.json(
      { error: "Upload a JPEG, PNG or WebP under 2 MB." },
      { status: 400 },
    );
  let image: Buffer;
  try {
    image = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 16_000_000,
      animated: false,
    })
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return Response.json(
      { error: "The file is not a valid supported image." },
      { status: 400 },
    );
  }
  const blob = await put(
    `items/${session.user.id}/${crypto.randomUUID()}.webp`,
    image,
    { access: "public", contentType: "image/webp" },
  );
  try {
    await prisma.storedImage.create({
      data: { url: blob.url, userId: session.user.id },
    });
  } catch (error) {
    await del(blob.url).catch(() => {});
    throw error;
  }
  return Response.json({ url: blob.url });
}
