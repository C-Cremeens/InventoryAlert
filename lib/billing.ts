import crypto from "node:crypto";
import type Stripe from "stripe";
import type { Tier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getStripeClient,
  getStripePriceIds,
  STRIPE_PRICES,
  STRIPE_PRODUCTS,
} from "@/lib/stripe";
import { appBaseUrl, lockUser } from "@/lib/security";

export function subscriptionTier(subscription: Stripe.Subscription): Tier {
  const price = subscription.items.data[0]?.price;
  const product =
    typeof price?.product === "string" ? price.product : price?.product?.id;
  const matches = STRIPE_PRODUCTS.PRO
    ? product === STRIPE_PRODUCTS.PRO
    : price?.id === STRIPE_PRICES.PRO;
  return matches &&
    ["active", "trialing", "past_due"].includes(subscription.status)
    ? "PRO"
    : "FREE";
}

export async function startCheckout(userId: string) {
  const stripe = getStripeClient();
  const baseUrl = appBaseUrl();
  // Commit the attempt before calling checkout; concurrent callers and retries use the same key.
  const prepared = await prisma.$transaction(
    async (tx) => {
      await lockUser(tx, userId);
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      let customer = user.stripeCustomerId;
      if (!customer) {
        const created = await stripe.customers.create(
          { email: user.email, metadata: { userId } },
          { idempotencyKey: `inventory-customer/${userId}` },
        );
        customer = created.id;
        await tx.user.update({
          where: { id: userId },
          data: { stripeCustomerId: customer },
        });
      }
      const subscriptions = await stripe.subscriptions.list({
        customer,
        status: "all",
        limit: 100,
      });
      if (
        subscriptions.has_more ||
        subscriptions.data.some(
          (s) => !["canceled", "incomplete_expired"].includes(s.status),
        )
      )
        return { customer, existing: true as const };
      const reuse =
        user.checkoutAttemptId &&
        user.checkoutAttemptExpires &&
        user.checkoutAttemptExpires.getTime() > Date.now();
      const attemptId = reuse ? user.checkoutAttemptId! : crypto.randomUUID();
      const expires = reuse
        ? user.checkoutAttemptExpires!
        : new Date(Math.floor(Date.now() / 1000) * 1000 + 3600_000);
      await tx.user.update({
        where: { id: userId },
        data: { checkoutAttemptId: attemptId, checkoutAttemptExpires: expires },
      });
      return { customer, existing: false as const, attemptId, expires };
    },
    { timeout: 30000, maxWait: 10000 },
  );
  if (prepared.existing)
    return (
      await stripe.billingPortal.sessions.create({
        customer: prepared.customer,
        return_url: `${baseUrl}/settings`,
      })
    ).url;
  const prices = await getStripePriceIds();
  const checkout = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: prepared.customer,
      line_items: [{ price: prices.PRO, quantity: 1 }],
      success_url: `${baseUrl}/settings?upgraded=1`,
      cancel_url: `${baseUrl}/settings`,
      expires_at: Math.floor(prepared.expires.getTime() / 1000),
      metadata: { userId, tier: "PRO" },
      subscription_data: { metadata: { userId } },
      consent_collection: { terms_of_service: "required" },
      custom_text: {
        terms_of_service_acceptance: {
          message: `I agree to the InventoryAlert [Terms of Service](${baseUrl}/terms).`,
        },
      },
    },
    { idempotencyKey: `inventory-checkout/${prepared.attemptId}` },
  );
  if (!checkout.url) throw new Error("Stripe did not provide a checkout URL");
  return checkout.url;
}

export async function applyStripeEvent(event: Stripe.Event) {
  const supported = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.payment_failed",
    "invoice.paid",
  ];
  if (!supported.includes(event.type)) return;
  const object = event.data.object as unknown as {
    customer?: string | { id: string } | null;
  };
  const customerId =
    typeof object.customer === "string" ? object.customer : object.customer?.id;
  if (!customerId) throw new Error("Billing event has no customer");
  const user = await prisma.user.findUnique({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  // Fail visibly/retry if an event for this integration cannot be associated.
  if (!user) throw new Error("No account mapped to billing customer");
  await prisma.$transaction(
    async (tx) => {
      await lockUser(tx, user.id);
      if (await tx.stripeWebhookEvent.findUnique({ where: { id: event.id } }))
        return;
      // Read current Stripe state under the account lock. Old event payloads cannot re-enable access.
      const current = await getStripeClient().subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
      });
      if (current.has_more)
        throw new Error("Subscription history requires manual reconciliation");
      const subscriptions = [...current.data].sort(
        (a, b) => b.created - a.created,
      );
      const subscription =
        subscriptions.find((s) => subscriptionTier(s) === "PRO") ??
        subscriptions.find(
          (s) => !["canceled", "incomplete_expired"].includes(s.status),
        );
      const tier = subscription ? subscriptionTier(subscription) : "FREE";
      await tx.user.update({
        where: { id: user.id },
        data: {
          tier,
          stripeSubscriptionId: subscription?.id ?? null,
          stripeSubscriptionStatus: subscription?.status ?? null,
          stripeCurrentPeriodEnd: subscription?.items.data[0]
            ?.current_period_end
            ? new Date(subscription.items.data[0].current_period_end * 1000)
            : null,
        },
      });
      await tx.stripeWebhookEvent.create({
        data: { id: event.id, type: event.type },
      });
    },
    { timeout: 30000, maxWait: 10000 },
  );
}
