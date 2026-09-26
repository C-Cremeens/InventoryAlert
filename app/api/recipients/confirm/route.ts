import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
export async function POST(req: Request) {
  const limit = await checkRateLimit(
    `consent-confirm:${getClientIp(req)}`,
    { limit: 20, windowSeconds: 3600 },
    true,
  );
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const parsed = z
    .object({
      token: z.string().regex(/^[a-f0-9]{64}$/),
      consent: z.literal(true),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Invalid confirmation." }, { status: 400 });
  const updated = await prisma.recipientConsent.updateMany({
    where: {
      tokenHash: crypto
        .createHash("sha256")
        .update(parsed.data.token)
        .digest("hex"),
      tokenExpiry: { gt: new Date() },
      verifiedAt: null,
    },
    data: { verifiedAt: new Date(), tokenHash: null, tokenExpiry: null },
  });
  return updated.count === 1
    ? Response.json({ ok: true })
    : Response.json({ error: "Invalid or expired link." }, { status: 400 });
}
