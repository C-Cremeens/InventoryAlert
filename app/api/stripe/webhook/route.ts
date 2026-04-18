import { NextRequest, NextResponse } from "next/server";
import { STRIPE_PRICES, STRIPE_PRODUCTS, getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";
import type { Tier } from "@prisma/client";

function logWebhook(
  level: "info" | "warn" | "error",
  eventType: string,
  data: Record<string, unknown>
) {
  const entry = JSON.stringify({ level, eventType, ...data, ts: new Date().toISOString() });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const stripe = getStripeClient();
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
    logWebhook("error", "webhook.signature_failed", { error: String(err) });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier as Tier | undefined;

        if (!userId || !tier) {
          logWebhook("warn", event.type, {
            eventId: event.id,
            reason: "missing metadata",
            hasUserId: !!userId,
            hasTier: !!tier,
          });
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        await prisma.user.update({
          where: { id: userId },
          data: {
            tier,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripeCurrentPeriodEnd: new Date((subscription.items.data[0]?.current_period_end ?? 0) * 1000),
          },
        });

        logWebhook("info", event.type, {
          eventId: event.id,
          userId,
          tier,
          subscriptionId: subscription.id,
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const user = await prisma.user.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (!user) {
          logWebhook("warn", event.type, {
            eventId: event.id,
            subscriptionId: subscription.id,
            reason: "no user found for subscription",
          });
          break;
        }

        const itemPrice = subscription.items.data[0]?.price;
        const productId = typeof itemPrice?.product === "string" ? itemPrice.product : itemPrice?.product?.id;
        const priceId = itemPrice?.id;

        let tier: Tier = "FREE";
        if (
          (STRIPE_PRODUCTS.FAMILY && productId === STRIPE_PRODUCTS.FAMILY) ||
          (!STRIPE_PRODUCTS.FAMILY && priceId === STRIPE_PRICES.FAMILY)
        ) {
          tier = "FAMILY";
        } else if (
          (STRIPE_PRODUCTS.ENTERPRISE && productId === STRIPE_PRODUCTS.ENTERPRISE) ||
          (!STRIPE_PRODUCTS.ENTERPRISE && priceId === STRIPE_PRICES.ENTERPRISE)
        ) {
          tier = "ENTERPRISE";
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            tier,
            stripeCurrentPeriodEnd: new Date((subscription.items.data[0]?.current_period_end ?? 0) * 1000),
          },
        });

        logWebhook("info", event.type, {
          eventId: event.id,
          userId: user.id,
          subscriptionId: subscription.id,
          tier,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const result = await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            tier: "FREE",
            stripeSubscriptionId: null,
            stripeCurrentPeriodEnd: null,
          },
        });

        logWebhook("info", event.type, {
          eventId: event.id,
          subscriptionId: subscription.id,
          usersUpdated: result.count,
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    logWebhook("error", "webhook.handler_error", {
      eventId: event.id,
      eventType: event.type,
      error: String(err),
    });
    // Return 500 so Stripe auto-retries the event
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
