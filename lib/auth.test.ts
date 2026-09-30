import { vi, describe, it, expect, beforeEach } from "vitest";
import type { NextAuthConfig } from "next-auth";
const { db, capture } = vi.hoisted(() => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    authIdentity: { findUnique: vi.fn(), create: vi.fn() },
  },
  capture: vi.fn(),
}));
vi.mock("next-auth", () => ({
  default: capture,
  CredentialsSignin: class extends Error {},
}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/rate-limit", () => ({
  RATE_LIMITS: {},
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}));
capture.mockReturnValue({});
await import("./auth");
const config = capture.mock.calls[0][0] as NextAuthConfig;
const jwt = config.callbacks!.jwt!;
const signIn = config.callbacks!.signIn!;
beforeEach(() => {
  Object.values(db.user).forEach((f) => f.mockReset());
  Object.values(db.authIdentity).forEach((f) => f.mockReset());
});
describe("authentication callbacks", () => {
  it("does not link an unverified account or preserve its password for Google", async () => {
    db.authIdentity.findUnique.mockResolvedValue(null);
    db.user.findFirst.mockResolvedValue({
      id: "victim",
      emailVerifiedAt: null,
      hashedPassword: "attacker-chosen",
    });
    const result = await signIn({
      account: { provider: "google" },
      profile: {
        email: "victim@example.com",
        sub: "google-id",
        email_verified: true,
      },
      user: {},
    } as Parameters<typeof signIn>[0]);
    expect(result).toBe("/login?error=AccountRecoveryRequired");
    expect(db.authIdentity.create).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });
  it("rejects an unverified Google identity", async () => {
    expect(
      await signIn({
        account: { provider: "google" },
        profile: {
          email: "victim@example.com",
          sub: "google-id",
          email_verified: false,
        },
        user: {},
      } as Parameters<typeof signIn>[0]),
    ).toBe(false);
  });
  it("refreshes plan from the database without waiting for another login", async () => {
    db.user.findUnique.mockResolvedValue({
      id: "u",
      sessionVersion: 2,
      tier: "FREE",
      email: "u@example.com",
      emailVerifiedAt: new Date(),
      termsAcceptedAt: new Date(),
    });
    const token = await jwt({
      token: { id: "u", sessionVersion: 2, tier: "PRO" },
    } as unknown as Parameters<typeof jwt>[0]);
    expect(token?.tier).toBe("FREE");
  });
  it("invalidates tokens after recovery, deletion, or from the legacy session format", async () => {
    db.user.findUnique.mockResolvedValue({ id: "u", sessionVersion: 3 });
    expect(
      await jwt({
        token: { id: "u", sessionVersion: 2 },
      } as unknown as Parameters<typeof jwt>[0]),
    ).toBeNull();
    db.user.findUnique.mockResolvedValue(null);
    expect(
      await jwt({
        token: { id: "u", sessionVersion: 3 },
      } as unknown as Parameters<typeof jwt>[0]),
    ).toBeNull();
    expect(
      await jwt({ token: { id: "u", tier: "PRO" } } as unknown as Parameters<
        typeof jwt
      >[0]),
    ).toBeNull();
  });
});
