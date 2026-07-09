import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { validateEnv } from "./env";

const REQUIRED = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
  NEXTAUTH_SECRET: "0123456789abcdef0123456789abcdef",
  NEXT_PUBLIC_BASE_URL: "https://example.com",
  RESEND_API_KEY: "re_test",
  RESEND_FROM_EMAIL: "alerts@example.com",
};

describe("validateEnv", () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(REQUIRED)) {
      vi.stubEnv(key, value);
    }
    // Clear optional groups so partial-config checks start clean
    for (const key of [
      "STRIPE_SECRET_KEY",
      "STRIPE_PRICE_PRO",
      "STRIPE_WEBHOOK_SECRET",
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      "VAPID_PRIVATE_KEY",
      "VAPID_SUBJECT",
      "GOOGLE_CLIENT_ID",
      "GOOGLE_CLIENT_SECRET",
      "BLOB_READ_WRITE_TOKEN",
    ]) {
      vi.stubEnv(key, "");
    }
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("passes with all required vars set", () => {
    expect(() => validateEnv()).not.toThrow();
  });

  it("throws in production when a required var is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(() => validateEnv()).toThrow(/RESEND_API_KEY/);
  });

  it("only warns in development when a required var is missing", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(() => validateEnv()).not.toThrow();
    expect(console.warn).toHaveBeenCalled();
  });

  it("treats a partially configured feature group as an error in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    expect(() => validateEnv()).toThrow(/Stripe is partially configured/);
  });

  it("accepts a fully configured feature group", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_x");
    vi.stubEnv("STRIPE_PRICE_PRO", "price_x");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_x");
    expect(() => validateEnv()).not.toThrow();
  });

  it("requires NEXTAUTH_SECRET to be at least 32 chars", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXTAUTH_SECRET", "short");
    expect(() => validateEnv()).toThrow(/NEXTAUTH_SECRET/);
  });
});
