import Stripe from "stripe";
import { TIER_LIMITS } from "@/lib/tier";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const STRIPE_PRICES = {
  FAMILY: process.env.STRIPE_PRICE_FAMILY!,
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE!,
} as const;

function formatStripePrice(price: Stripe.Price): string {
  const amount = price.unit_amount ? price.unit_amount / 100 : 0;
  const interval = price.recurring?.interval ?? "mo";
  const formatted = Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
  return `${formatted}/${interval}`;
}

export async function fetchStripePrices(): Promise<Record<"FAMILY" | "ENTERPRISE", string>> {
  try {
    const [family, enterprise] = await Promise.all([
      stripe.prices.retrieve(STRIPE_PRICES.FAMILY),
      stripe.prices.retrieve(STRIPE_PRICES.ENTERPRISE),
    ]);
    return {
      FAMILY: formatStripePrice(family),
      ENTERPRISE: formatStripePrice(enterprise),
    };
  } catch {
    return {
      FAMILY: TIER_LIMITS.FAMILY.price,
      ENTERPRISE: TIER_LIMITS.ENTERPRISE.price,
    };
  }
}
