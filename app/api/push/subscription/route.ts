import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushSubscriptionSchema } from "@/lib/push-validation";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
export async function POST(req: Request) {
  const session = await auth();
  if (
    !session?.user?.id ||
    !session.user.emailVerifiedAt ||
    !session.user.termsAcceptedAt
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const limit = await checkRateLimit(
    `push:${session.user.id}`,
    { limit: 20, windowSeconds: 3600 },
    true,
  );
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const parsed = pushSubscriptionSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { error: "Invalid subscription payload." },
      { status: 400 },
    );
  const { endpoint, keys } = parsed.data;
  // Never transfer endpoint ownership on upsert. Update only if the owner matches.
  await prisma.pushSubscription.createMany({
    data: [{ endpoint, userId: session.user.id, ...keys }],
    skipDuplicates: true,
  });
  const updated = await prisma.pushSubscription.updateMany({
    where: { endpoint, userId: session.user.id },
    data: { ...keys, userAgent: req.headers.get("user-agent")?.slice(0, 500) },
  });
  if (!updated.count)
    return Response.json(
      {
        error:
          "This browser subscription belongs to another account. Reset browser notification permission before enabling it here.",
      },
      { status: 409 },
    );
  return Response.json({ ok: true });
}
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.endpoint !== "string")
    return Response.json({ error: "Endpoint is required." }, { status: 400 });
  await prisma.pushSubscription.deleteMany({
    where: { endpoint: body.endpoint, userId: session.user.id },
  });
  return Response.json({ ok: true });
}
