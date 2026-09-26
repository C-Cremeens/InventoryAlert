import type { Prisma } from "@prisma/client";

// Every mutation that competes for a per-account resource uses the same lock.
// PostgreSQL releases it automatically on commit/rollback.
export async function lockUser(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
}

export function safeReturnPath(value: string | null | undefined) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
    ? value
    : "/dashboard";
}

export function appBaseUrl() {
  const url = new URL(
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
  );
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_BASE_URL must use HTTPS in production");
  }
  return url.origin;
}

export function canLinkGoogle(emailVerifiedAt: Date | null) {
  return emailVerifiedAt !== null;
}

export const TERMS_VERSION = "2026-04-18";
