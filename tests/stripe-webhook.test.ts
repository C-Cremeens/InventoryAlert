import { vi, describe, it, expect, beforeEach } from "vitest";
const { reportError, applyStripeEvent } = vi.hoisted(() => ({
  reportError: vi.fn(),
  applyStripeEvent: vi.fn(),
}));
vi.mock("@/lib/monitoring", () => ({ reportError }));
vi.mock("@/lib/billing", () => ({ applyStripeEvent }));
vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => true,
  getStripeClient: () => ({
    webhooks: { constructEvent: () => ({ id: "evt_test", type: "test" }) },
  }),
}));
import { POST } from "@/app/api/stripe/webhook/route";

describe("Stripe webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
  });

  it("reports the underlying reconciliation error", async () => {
    const failure = new Error("database unavailable");
    applyStripeEvent.mockRejectedValue(failure);
    const response = await POST(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        body: "{}",
      }),
    );
    expect(response.status).toBe(500);
    expect(reportError).toHaveBeenCalledWith(
      "Stripe reconciliation failed",
      failure,
    );
    expect(console.error).toHaveBeenCalledWith(
      "Stripe reconciliation failed for event",
      "evt_test",
    );
  });
});
