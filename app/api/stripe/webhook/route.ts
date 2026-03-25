import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import type { Tier } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.text(); // Must read raw body before any parsing
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier as Tier | undefined;

        if (!userId || !tier) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        // Use billing_cycle_anchor as the next renewal reference (Stripe API 2026+)
        const renewalDate = new Date(subscription.billing_cycle_anchor * 1000);

        await prisma.user.update({
          where: { id: userId },
          data: {
            tier,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripeCurrentPeriodEnd: renewalDate,
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await prisma.user.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (!user) break;

        // Determine tier from price
        const priceId = subscription.items.data[0]?.price.id;
        let tier: Tier = "FREE";
        if (priceId === process.env.STRIPE_PRICE_FAMILY) tier = "FAMILY";
        else if (priceId === process.env.STRIPE_PRICE_ENTERPRISE)
          tier = "ENTERPRISE";

        await prisma.user.update({
          where: { id: user.id },
          data: {
            tier,
            stripeCurrentPeriodEnd: new Date(
              subscription.billing_cycle_anchor * 1000
            ),
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            tier: "FREE",
            stripeSubscriptionId: null,
            stripeCurrentPeriodEnd: null,
          },
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
