import { appBaseUrl } from "@/lib/security";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";

export async function POST() {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  const session = await auth();
  if (
    !session?.user?.id ||
    !session.user.emailVerifiedAt ||
    !session.user.termsAcceptedAt
  )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No active subscription found." },
      { status: 400 },
    );
  }

  const baseUrl = appBaseUrl();
  const stripe = getStripeClient();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${baseUrl}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
