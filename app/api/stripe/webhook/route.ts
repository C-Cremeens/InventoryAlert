import { reportError } from "@/lib/monitoring";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";
import { applyStripeEvent } from "@/lib/billing";
export const maxDuration = 60;
export async function POST(req: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET)
    return Response.json({ error: "Billing is unavailable." }, { status: 503 });
  let event;
  try {
    event = getStripeClient().webhooks.constructEvent(
      await req.text(),
      req.headers.get("stripe-signature") ?? "",
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }
  try {
    await applyStripeEvent(event);
  } catch (error) {
    console.error("Stripe reconciliation failed for event", event.id);
    reportError("Stripe reconciliation failed", error);
    return Response.json({ error: "Handler error." }, { status: 500 });
  }
  return Response.json({ received: true });
}
