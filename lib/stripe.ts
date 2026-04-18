import Stripe from "stripe";
import { TIER_LIMITS } from "@/lib/tier";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const STRIPE_PRICES = {
  FAMILY: process.env.STRIPE_PRICE_FAMILY!,
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE!,
} as const;

export const STRIPE_PRODUCTS = {
  FAMILY: process.env.STRIPE_PRODUCT_FAMILY,
  ENTERPRISE: process.env.STRIPE_PRODUCT_ENTERPRISE,
} as const;

type PaidTier = "FAMILY" | "ENTERPRISE";

function formatStripePrice(price: Stripe.Price): string {
  const amount = price.unit_amount ? price.unit_amount / 100 : 0;
  const interval = price.recurring?.interval ?? "mo";
  const formatted = Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
  return `${formatted}/${interval}`;
}

async function getDefaultPriceIdForProduct(productId: string): Promise<string | null> {
  const product = await stripe.products.retrieve(productId, { expand: ["default_price"] });
  if (!product.default_price) return null;

  if (typeof product.default_price === "string") {
    return product.default_price;
  }

  return product.default_price.id;
}

export async function getStripePriceIds(): Promise<Record<PaidTier, string>> {
  const tiers: PaidTier[] = ["FAMILY", "ENTERPRISE"];
  const fallback: Record<PaidTier, string> = {
    FAMILY: STRIPE_PRICES.FAMILY,
    ENTERPRISE: STRIPE_PRICES.ENTERPRISE,
  };

  const resolved = await Promise.all(
    tiers.map(async (tier) => {
      const productId = STRIPE_PRODUCTS[tier];
      if (!productId) {
        return [tier, fallback[tier]] as const;
      }

      try {
        const defaultPriceId = await getDefaultPriceIdForProduct(productId);
        return [tier, defaultPriceId ?? fallback[tier]] as const;
      } catch {
        return [tier, fallback[tier]] as const;
      }
    })
  );

  return Object.fromEntries(resolved) as Record<PaidTier, string>;
}

export async function fetchStripePrices(): Promise<Record<PaidTier, string>> {
  try {
    const priceIds = await getStripePriceIds();
    const [family, enterprise] = await Promise.all([
      stripe.prices.retrieve(priceIds.FAMILY),
      stripe.prices.retrieve(priceIds.ENTERPRISE),
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
