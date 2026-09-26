import { describe, it, expect, vi, afterEach } from "vitest";
import { canLinkGoogle, safeReturnPath } from "./security";
import { isPushEndpoint, pushSubscriptionSchema } from "./push-validation";
import { authorizedJob } from "./cron-auth";
import { isLegacyOwnedImage } from "./images";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@vercel/blob", () => ({ del: vi.fn() }));
vi.mock("@/lib/monitoring", () => ({ reportError: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());
describe("production security boundaries", () => {
  it("does not link Google to an unverified password account", () => {
    expect(canLinkGoogle(null)).toBe(false);
    expect(canLinkGoogle(new Date())).toBe(true);
  });
  it("rejects external and protocol-relative return paths", () => {
    for (const path of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
    ])
      expect(safeReturnPath(path)).toBe("/dashboard");
    expect(safeReturnPath("/items")).toBe("/items");
  });
  it("accepts only known HTTPS push services, not internal or lookalike URLs", () => {
    expect(isPushEndpoint("https://web.push.apple.com/token")).toBe(true);
    expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/token")).toBe(
      true,
    );
    for (const url of [
      "http://fcm.googleapis.com/token",
      "https://localhost/token",
      "https://127.0.0.1/",
      "https://fcm.googleapis.com.evil.example/",
      "https://user:pass@fcm.googleapis.com/",
      "https://fcm.googleapis.com:444/",
    ])
      expect(isPushEndpoint(url)).toBe(false);
  });
  it("rejects malformed push keys", () => {
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "https://web.push.apple.com/token",
        keys: { auth: "bad", p256dh: "bad" },
      }).success,
    ).toBe(false);
  });
  it("requires exact configured legacy Blob host and owner path", () => {
    vi.stubEnv("BLOB_PUBLIC_HOSTNAME", "store.public.blob.vercel-storage.com");
    expect(
      isLegacyOwnedImage(
        "https://store.public.blob.vercel-storage.com/items/alice/photo.png",
        "alice",
      ),
    ).toBe(true);
    expect(
      isLegacyOwnedImage(
        "https://store.public.blob.vercel-storage.com/items/bob/photo.png",
        "alice",
      ),
    ).toBe(false);
    expect(
      isLegacyOwnedImage(
        "https://other.public.blob.vercel-storage.com/items/alice/photo.png",
        "alice",
      ),
    ).toBe(false);
    expect(
      isLegacyOwnedImage(
        "https://store.public.blob.vercel-storage.com/items/alice/../bob/photo.png",
        "alice",
      ),
    ).toBe(false);
  });
  it("fails closed when the worker secret is missing, short, or wrong", () => {
    const req = (token: string) =>
      new Request("https://example.com", {
        headers: { authorization: `Bearer ${token}` },
      });
    vi.stubEnv("CRON_SECRET", "");
    expect(authorizedJob(req(""))).toBe(false);
    vi.stubEnv("CRON_SECRET", "x".repeat(32));
    expect(authorizedJob(req("y".repeat(32)))).toBe(false);
    expect(authorizedJob(req("x".repeat(32)))).toBe(true);
  });
});
