import Stripe from "stripe";
import { TIER_LIMITS } from "@/lib/tier";

let stripeClient: Stripe | null = null;

function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: "2026-02-25.clover",
  });
}

function getStripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY ?? null;
}

export const STRIPE_PRICES = {
  PRO: process.env.STRIPE_PRICE_PRO ?? "",
} as const;

export const STRIPE_PRODUCTS = {
  PRO: process.env.STRIPE_PRODUCT_PRO,
} as const;

type PaidTier = "PRO";

export function isStripeConfigured(): boolean {
  return Boolean(
    getStripeSecretKey() &&
    STRIPE_PRICES.PRO
  );
}

export function getStripeClient(): Stripe {
  const secretKey = getStripeSecretKey();
  if (!secretKey) {
    throw new Error("Stripe is not configured (missing STRIPE_SECRET_KEY).");
  }

  if (!stripeClient) {
    stripeClient = createStripeClient(secretKey);
  }

  return stripeClient;
}

function formatStripePrice(price: Stripe.Price): string {
  const amount = price.unit_amount ? price.unit_amount / 100 : 0;
  const interval = price.recurring?.interval ?? "mo";
  const formatted = Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
  return `${formatted}/${interval}`;
}

async function getDefaultPriceIdForProduct(productId: string): Promise<string | null> {
  const stripe = getStripeClient();
  const product = await stripe.products.retrieve(productId, { expand: ["default_price"] });
  if (!product.default_price) return null;

  if (typeof product.default_price === "string") {
    return product.default_price;
  }

  return product.default_price.id;
}

export async function getStripePriceIds(): Promise<Record<PaidTier, string>> {
  const tiers: PaidTier[] = ["PRO"];
  const fallback: Record<PaidTier, string> = {
    PRO: STRIPE_PRICES.PRO,
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
  if (!isStripeConfigured()) {
    return {
      PRO: TIER_LIMITS.PRO.price,
    };
  }

  try {
    const stripe = getStripeClient();
    const priceIds = await getStripePriceIds();
    const pro = await stripe.prices.retrieve(priceIds.PRO);

    return {
      PRO: formatStripePrice(pro),
    };
  } catch {
    return {
      PRO: TIER_LIMITS.PRO.price,
    };
  }
}
