import crypto from "node:crypto";
import { vi, describe, it, expect, beforeEach, afterAll } from "vitest";
import type { Session } from "next-auth";
import type Stripe from "stripe";
import { NextRequest } from "next/server";
const { auth, send, stripe, del } = vi.hoisted(() => ({
  auth: vi.fn(),
  send: vi.fn(),
  del: vi.fn(),
  stripe: {
    subscriptions: { list: vi.fn() },
    customers: { create: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
  },
}));
vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/resend", () => ({ sendAlertEmail: send }));
vi.mock("@/lib/monitoring", () => ({ reportError: vi.fn() }));
vi.mock("@vercel/blob", () => ({ del }));
vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => stripe,
  getStripePriceIds: async () => ({ PRO: "price_test" }),
  STRIPE_PRICES: { PRO: "price_test" },
  STRIPE_PRODUCTS: {},
}));
import { prisma } from "@/lib/prisma";
import { recordScan } from "@/lib/scan";
import { processNotification } from "@/lib/notifications";
import { applyStripeEvent, startCheckout } from "@/lib/billing";
import { POST as createItem } from "@/app/api/items/route";
import {
  PATCH as patchItem,
  DELETE as deleteItem,
} from "@/app/api/items/[itemId]/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { POST as savePush } from "@/app/api/push/subscription/route";
import { POST as confirmRecipient } from "@/app/api/recipients/confirm/route";
import { GET as getRequests } from "@/app/api/requests/route";
import ScanPage from "@/app/scan/[qrCodeId]/page";

const prefix = `integration-${crypto.randomUUID()}`;
const uid = `${prefix}-owner`,
  other = `${prefix}-other`;
const email = `${uid}@example.com`;
function request(body: unknown, method = "POST") {
  return new NextRequest("http://localhost/api/test", {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": prefix },
    body: JSON.stringify(body),
  });
}
const params = (itemId: string) => ({ params: Promise.resolve({ itemId }) });
const ownerSession = () =>
  ({
    user: {
      id: uid,
      email,
      tier: "FREE",
      emailVerifiedAt: new Date().toISOString(),
      termsAcceptedAt: new Date().toISOString(),
      sessionVersion: 1,
    },
    expires: "2099-01-01",
  }) as Session;
async function item() {
  return prisma.inventoryItem.create({
    data: {
      userId: uid,
      name: "Soap",
      alertEmail: email,
      alertRecipients: {
        create: {
          kind: "INLINE_EMAIL",
          inlineEmail: email,
          inlineEmailNormalized: email,
        },
      },
    },
  });
}
const subscription = (
  status: Stripe.Subscription.Status,
): Stripe.Subscription =>
  ({
    id: "sub_test",
    created: 1,
    status,
    items: {
      data: [
        {
          price: { id: "price_test", product: "product_test" },
          current_period_end: 2000000000,
        },
      ],
    },
  }) as unknown as Stripe.Subscription;
const event = (id: string, type: string) =>
  ({
    id: `${prefix}-${id}`,
    type,
    data: { object: { customer: `cus_${prefix}` } },
  }) as Stripe.Event;

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "production workflows against PostgreSQL",
  () => {
    beforeEach(async () => {
      const url = new URL(process.env.TEST_DATABASE_URL!);
      if (
        !url.pathname.endsWith("_test") ||
        !["127.0.0.1", "localhost", "postgres"].includes(url.hostname)
      )
        throw new Error("Integration tests require a local *_test database");
      vi.clearAllMocks();
      await prisma.user.deleteMany({ where: { id: { in: [uid, other] } } });
      await prisma.stripeWebhookEvent.deleteMany({
        where: { id: { startsWith: prefix } },
      });
      await prisma.rateLimitWindow.deleteMany({
        where: { key: { contains: prefix } },
      });
      await prisma.user.createMany({
        data: [
          {
            id: uid,
            email,
            emailVerifiedAt: new Date(),
            termsAcceptedAt: new Date(),
          },
          {
            id: other,
            email: `${other}@example.com`,
            emailVerifiedAt: new Date(),
            termsAcceptedAt: new Date(),
          },
        ],
      });
      auth.mockResolvedValue(ownerSession());
      send.mockResolvedValue("email_accepted");
      del.mockResolvedValue(undefined);
      stripe.subscriptions.list.mockResolvedValue({
        data: [],
        has_more: false,
      });
      stripe.customers.create.mockResolvedValue({ id: `cus_${prefix}` });
      stripe.checkout.sessions.create.mockResolvedValue({
        url: "https://checkout.stripe.com/test",
      });
      stripe.billingPortal.sessions.create.mockResolvedValue({
        url: "https://billing.stripe.com/test",
      });
    });
    afterAll(async () => {
      await prisma.user.deleteMany({ where: { id: { in: [uid, other] } } });
      await prisma.stripeWebhookEvent.deleteMany({
        where: { id: { startsWith: prefix } },
      });
      await prisma.rateLimitWindow.deleteMany({
        where: { key: { contains: prefix } },
      });
      await prisma.$disconnect();
    });
    it("viewing a scan URL is read-only", async () => {
      const i = await item();
      await ScanPage({ params: Promise.resolve({ qrCodeId: i.qrCodeId }) });
      expect(
        await prisma.stockingRequest.count({ where: { itemId: i.id } }),
      ).toBe(0);
    });
    it("concurrent scans create one request and one email job", async () => {
      const i = await item();
      const results = await Promise.all(
        Array.from({ length: 8 }, () =>
          recordScan(i.qrCodeId, crypto.randomUUID()),
        ),
      );
      expect(results.filter((r) => r?.created)).toHaveLength(1);
      expect(
        await prisma.stockingRequest.count({ where: { itemId: i.id } }),
      ).toBe(1);
      expect(
        await prisma.notificationJob.count({
          where: { request: { itemId: i.id } },
        }),
      ).toBe(1);
    });
    it("reusing a submission key stays idempotent after cooldown", async () => {
      const i = await item(),
        key = crypto.randomUUID();
      const first = await recordScan(i.qrCodeId, key);
      await prisma.inventoryItem.update({
        where: { id: i.id },
        data: { lastAlertAt: null },
      });
      const second = await recordScan(i.qrCodeId, key);
      expect(second?.created).toBe(false);
      expect(second?.requestId).toBe(first?.requestId);
    });
    it("does not enqueue alerts to unverified accounts or unconfirmed third parties", async () => {
      const i = await item();
      await prisma.inventoryItemRecipient.updateMany({
        where: { itemId: i.id },
        data: {
          inlineEmail: "unconfirmed@example.com",
          inlineEmailNormalized: "unconfirmed@example.com",
        },
      });
      const result = await recordScan(i.qrCodeId, crypto.randomUUID());
      expect(result?.message).toContain("not available");
      expect(
        await prisma.notificationJob.count({
          where: { requestId: result!.requestId! },
        }),
      ).toBe(0);
      await prisma.user.update({
        where: { id: uid },
        data: { emailVerifiedAt: null },
      });
      const next = await item();
      await recordScan(next.qrCodeId, crypto.randomUUID());
      expect(
        await prisma.notificationJob.count({
          where: { request: { itemId: next.id } },
        }),
      ).toBe(0);
    });
    it("records provider failure honestly and retries with the same key", async () => {
      const i = await item();
      const r = await recordScan(i.qrCodeId, crypto.randomUUID());
      const job = await prisma.notificationJob.findFirstOrThrow({
        where: { requestId: r!.requestId! },
      });
      send.mockRejectedValueOnce(new Error("provider unavailable"));
      await processNotification(job.id);
      expect(
        (
          await prisma.stockingRequest.findUniqueOrThrow({
            where: { id: r!.requestId! },
          })
        ).emailSent,
      ).toBe(false);
      expect(
        (
          await prisma.notificationJob.findUniqueOrThrow({
            where: { id: job.id },
          })
        ).status,
      ).toBe("PENDING");
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: { nextAttemptAt: new Date(0) },
      });
      await processNotification(job.id);
      expect(send.mock.calls[0][2]).toBe(send.mock.calls[1][2]);
      expect(
        (
          await prisma.stockingRequest.findUniqueOrThrow({
            where: { id: r!.requestId! },
          })
        ).emailSent,
      ).toBe(true);
    });
    it("claims a job once under concurrent workers and freezes its email content", async () => {
      const i = await item();
      const r = await recordScan(i.qrCodeId, crypto.randomUUID());
      const job = await prisma.notificationJob.findFirstOrThrow({
        where: { requestId: r!.requestId! },
      });
      await prisma.inventoryItem.update({
        where: { id: i.id },
        data: { name: "Changed name" },
      });
      await Promise.all([
        processNotification(job.id),
        processNotification(job.id),
      ]);
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][1]).toBe("Soap");
    });
    it("recovers an expired lease and stops retrying jobs older than the safe window", async () => {
      const i = await item();
      const r = await recordScan(i.qrCodeId, crypto.randomUUID());
      const job = await prisma.notificationJob.findFirstOrThrow({
        where: { requestId: r!.requestId! },
      });
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: "PROCESSING",
          lockedUntil: new Date(0),
          createdAt: new Date(Date.now() - 86400_000),
        },
      });
      await processNotification(job.id);
      expect(send).not.toHaveBeenCalled();
      expect(
        (
          await prisma.notificationJob.findUniqueOrThrow({
            where: { id: job.id },
          })
        ).status,
      ).toBe("FAILED");
    });
    it("enforces the free item limit across concurrent requests", async () => {
      const responses = await Promise.all(
        Array.from({ length: 7 }, () =>
          createItem(request({ name: "Soap", alertEmail: email })),
        ),
      );
      expect(responses.filter((r) => r.status === 201)).toHaveLength(5);
      expect(responses.filter((r) => r.status === 403)).toHaveLength(2);
    });
    it("rejects cross-account image assignment and item access", async () => {
      const foreignUrl =
        "https://store.public.blob.vercel-storage.com/items/other/photo.webp";
      await prisma.storedImage.create({
        data: { url: foreignUrl, userId: other },
      });
      expect(
        (
          await createItem(
            request({ name: "Soap", alertEmail: email, imageUrl: foreignUrl }),
          )
        ).status,
      ).toBe(400);
      const i = await prisma.inventoryItem.create({
        data: {
          userId: other,
          name: "Private",
          alertEmail: "other@example.com",
        },
      });
      expect(
        (await patchItem(request({ name: "Changed" }, "PATCH"), params(i.id)))
          .status,
      ).toBe(404);
      expect(del).not.toHaveBeenCalled();
    });
    it("keeps an unchanged legacy image without an ownership record when editing", async () => {
      const url = `https://store.public.blob.vercel-storage.com/items/${uid}/legacy.webp`;
      const i = await item();
      await prisma.inventoryItem.update({
        where: { id: i.id },
        data: { imageUrl: url },
      });
      const response = await patchItem(
        request({ name: "Changed", imageUrl: url }, "PATCH"),
        params(i.id),
      );
      expect(response.status).toBe(200);
      expect(
        (await prisma.inventoryItem.findUnique({ where: { id: i.id } }))?.name,
      ).toBe("Changed");
      expect(del).not.toHaveBeenCalled();
    });
    it("does not delete a shared owned image until its last reference is removed", async () => {
      const url = `https://store.public.blob.vercel-storage.com/items/${uid}/photo.webp`;
      await prisma.storedImage.create({ data: { url, userId: uid } });
      const a = await item(),
        b = await item();
      await prisma.inventoryItem.updateMany({
        where: { id: { in: [a.id, b.id] } },
        data: { imageUrl: url },
      });
      await deleteItem(request({}, "DELETE"), params(a.id));
      expect(del).not.toHaveBeenCalled();
      await deleteItem(request({}, "DELETE"), params(b.id));
      expect(del).toHaveBeenCalledWith(url);
    });
    it("enforces Pro labels in the API", async () => {
      const i = await item();
      const response = await patchItem(
        request(
          { labelLayout: { size: "3x1", qrPosition: "left", elements: [] } },
          "PATCH",
        ),
        params(i.id),
      );
      expect(response.status).toBe(403);
    });
    it("consumes a password-reset token once and revokes previous sessions", async () => {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.user.update({
        where: { id: uid },
        data: {
          emailVerifiedAt: null,
          passwordResetToken: crypto
            .createHash("sha256")
            .update(token)
            .digest("hex"),
          passwordResetExpiry: new Date(Date.now() + 3600_000),
        },
      });
      const results = await Promise.all(
        [1, 2].map(() =>
          resetPassword(
            request({
              token,
              password: "NewStrong123!",
              confirmPassword: "NewStrong123!",
            }),
          ),
        ),
      );
      expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
      const user = await prisma.user.findUniqueOrThrow({ where: { id: uid } });
      expect(user.sessionVersion).toBe(2);
      expect(user.emailVerifiedAt).not.toBeNull();
      expect(user.passwordResetToken).toBeNull();
    });
    it("a confirmation token is one-use", async () => {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.recipientConsent.create({
        data: {
          userId: uid,
          email: "recipient@example.com",
          tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
          tokenExpiry: new Date(Date.now() + 60000),
        },
      });
      expect(
        (await confirmRecipient(request({ token, consent: true }))).status,
      ).toBe(200);
      expect(
        (await confirmRecipient(request({ token, consent: true }))).status,
      ).toBe(400);
    });
    it("does not transfer push subscriptions between accounts", async () => {
      const endpoint = "https://web.push.apple.com/unique-test";
      const p256dh = Buffer.concat([
          Buffer.from([4]),
          Buffer.alloc(64, 1),
        ]).toString("base64url"),
        key = Buffer.alloc(16, 2).toString("base64url");
      await prisma.pushSubscription.create({
        data: { userId: other, endpoint, p256dh, auth: key },
      });
      expect(
        (await savePush(request({ endpoint, keys: { p256dh, auth: key } })))
          .status,
      ).toBe(409);
      expect(
        (
          await prisma.pushSubscription.findUniqueOrThrow({
            where: { endpoint },
          })
        ).userId,
      ).toBe(other);
    });
    it("paginates requests without returning another account's data", async () => {
      const i = await item();
      await prisma.stockingRequest.createMany({
        data: Array.from({ length: 30 }, () => ({ itemId: i.id })),
      });
      const first = await (
        await getRequests(new Request("http://localhost/api/requests"))
      ).json();
      const second = await (
        await getRequests(new Request("http://localhost/api/requests?page=2"))
      ).json();
      expect(first.requests).toHaveLength(25);
      expect(first.hasMore).toBe(true);
      expect(second.requests).toHaveLength(5);
      expect(
        new Set(
          [...first.requests, ...second.requests].map(
            (r: { id: string }) => r.id,
          ),
        ).size,
      ).toBe(30);
    });
    it("reuses a checkout attempt for concurrent callers", async () => {
      await Promise.all([startCheckout(uid), startCheckout(uid)]);
      expect(stripe.customers.create).toHaveBeenCalledTimes(1);
      expect(
        stripe.checkout.sessions.create.mock.calls[0][1].idempotencyKey,
      ).toBe(stripe.checkout.sessions.create.mock.calls[1][1].idempotencyKey);
    });
    it("replaces a checkout attempt too close to expiry for Stripe", async () => {
      await prisma.user.update({
        where: { id: uid },
        data: {
          stripeCustomerId: `cus_${prefix}`,
          checkoutAttemptId: "stale-attempt",
          checkoutAttemptExpires: new Date(Date.now() + 20 * 60_000),
        },
      });
      await startCheckout(uid);
      const [params, options] = stripe.checkout.sessions.create.mock.calls[0];
      expect(options.idempotencyKey).not.toBe(
        "inventory-checkout/stale-attempt",
      );
      expect(params.expires_at * 1000).toBeGreaterThan(
        Date.now() + 30 * 60_000,
      );
    });
    it("routes an existing subscriber to the billing portal", async () => {
      stripe.subscriptions.list.mockResolvedValue({
        data: [subscription("active")],
        has_more: false,
      });
      expect(await startCheckout(uid)).toContain("billing.stripe.com");
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });
    it("reconciles current subscription state instead of applying delayed event snapshots", async () => {
      await prisma.user.update({
        where: { id: uid },
        data: { stripeCustomerId: `cus_${prefix}`, tier: "PRO" },
      });
      const delayed = event("delayed", "checkout.session.completed");
      stripe.subscriptions.list.mockResolvedValue({
        data: [subscription("canceled")],
        has_more: false,
      });
      await Promise.all([applyStripeEvent(delayed), applyStripeEvent(delayed)]);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: uid } })).tier,
      ).toBe("FREE");
      expect(
        await prisma.stripeWebhookEvent.count({ where: { id: delayed.id } }),
      ).toBe(1);
      stripe.subscriptions.list.mockResolvedValue({
        data: [subscription("active")],
        has_more: false,
      });
      await applyStripeEvent(event("recovered", "invoice.paid"));
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: uid } })).tier,
      ).toBe("PRO");
    });
  },
  30000,
);
