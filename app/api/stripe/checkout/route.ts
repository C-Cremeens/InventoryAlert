import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe, STRIPE_PRICES } from "@/lib/stripe";
import { z } from "zod";
import type { Tier } from "@prisma/client";

const schema = z.object({
  tier: z.enum(["FAMILY", "ENTERPRISE"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const tier = parsed.data.tier as Exclude<Tier, "FREE">;
  const priceId = STRIPE_PRICES[tier];
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true, email: true },
  });

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: user?.stripeCustomerId ?? undefined,
    customer_email: user?.stripeCustomerId ? undefined : user?.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/settings?upgraded=1`,
    cancel_url: `${baseUrl}/settings`,
    metadata: { userId: session.user.id, tier },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
