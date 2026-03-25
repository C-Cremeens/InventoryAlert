import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

export const STRIPE_PRICES = {
  FAMILY: process.env.STRIPE_PRICE_FAMILY!,
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE!,
} as const;
