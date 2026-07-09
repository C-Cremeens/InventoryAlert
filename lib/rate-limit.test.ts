import { describe, it, expect, vi, beforeEach } from "vitest";

const upsert = vi.fn();
const deleteMany = vi.fn().mockResolvedValue({ count: 0 });

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rateLimitWindow: {
      upsert: (...args: unknown[]) => upsert(...args),
      deleteMany: (...args: unknown[]) => deleteMany(...args),
    },
  },
}));

import { RATE_LIMITS, checkRateLimit, getClientIp } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    upsert.mockReset();
    deleteMany.mockClear();
  });

  it("allows requests at or under the limit", async () => {
    upsert.mockResolvedValue({ count: 5 });
    const result = await checkRateLimit("test:key", { limit: 5, windowSeconds: 60 });
    expect(result.allowed).toBe(true);
    expect(result.retryAfterSeconds).toBe(0);
  });

  it("blocks requests over the limit with a positive Retry-After", async () => {
    upsert.mockResolvedValue({ count: 6 });
    const result = await checkRateLimit("test:key", { limit: 5, windowSeconds: 60 });
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("keys the counter by key + aligned window start", async () => {
    upsert.mockResolvedValue({ count: 1 });
    await checkRateLimit("scan:item:abc", { limit: 5, windowSeconds: 3600 });
    const arg = upsert.mock.calls[0][0] as {
      where: { key_windowStart: { key: string; windowStart: Date } };
    };
    expect(arg.where.key_windowStart.key).toBe("scan:item:abc");
    // Window start must be aligned to the window size
    expect(arg.where.key_windowStart.windowStart.getTime() % (3600 * 1000)).toBe(0);
  });

  it("fails open when the database errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    upsert.mockRejectedValue(new Error("db down"));
    const result = await checkRateLimit("test:key", { limit: 5, windowSeconds: 60 });
    expect(result.allowed).toBe(true);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("RATE_LIMITS", () => {
  it("defines budgets for every protected surface", () => {
    for (const key of [
      "scanPerIp",
      "scanPerItem",
      "loginPerIpEmail",
      "registerPerIp",
      "forgotPasswordPerIp",
      "forgotPasswordPerEmail",
      "resetPasswordPerIp",
      "uploadPerUser",
    ] as const) {
      expect(RATE_LIMITS[key].limit).toBeGreaterThan(0);
      expect(RATE_LIMITS[key].windowSeconds).toBeGreaterThan(0);
    }
  });
});

describe("getClientIp", () => {
  it("takes the first x-forwarded-for entry", () => {
    const req = new Request("http://x", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(getClientIp(req)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(
      getClientIp(new Request("http://x", { headers: { "x-real-ip": "198.51.100.2" } }))
    ).toBe("198.51.100.2");
    expect(getClientIp(new Request("http://x"))).toBe("unknown");
  });
});
