import { reportError } from "@/lib/monitoring";
import { auth } from "@/lib/auth";
import { isStripeConfigured } from "@/lib/stripe";
import { startCheckout } from "@/lib/billing";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
export async function POST(req: Request) {
  const session = await auth();
  if (
    !session?.user?.id ||
    !session.user.emailVerifiedAt ||
    !session.user.termsAcceptedAt
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isStripeConfigured())
    return Response.json({ error: "Billing is unavailable." }, { status: 503 });
  const limit = await checkRateLimit(
    `checkout:${session.user.id}`,
    { limit: 10, windowSeconds: 3600 },
    true,
  );
  if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  const body = await req.json().catch(() => null);
  if (body?.tier !== "PRO")
    return Response.json({ error: "Invalid tier." }, { status: 400 });
  try {
    return Response.json({ url: await startCheckout(session.user.id) });
  } catch (error) {
    reportError("Checkout failed", error);
    return Response.json(
      { error: "Unable to start billing. Please try again." },
      { status: 502 },
    );
  }
}
