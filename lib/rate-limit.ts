import { prisma } from "@/lib/prisma";

/**
 * DB-backed fixed-window rate limiter. Counters live in Postgres
 * (RateLimitWindow) so limits hold across serverless function instances —
 * an in-memory limiter would reset on every cold start.
 *
 * Fails open: if the counter can't be read or written, the request is
 * allowed and the error logged. Rate limiting must never take the
 * product down with it.
 */

export const RATE_LIMITS = {
  scanPerIp: { limit: 30, windowSeconds: 3600 },
  scanPerItem: { limit: 120, windowSeconds: 3600 },
  loginPerIpEmail: { limit: 5, windowSeconds: 900 },
  registerPerIp: { limit: 10, windowSeconds: 3600 },
  forgotPasswordPerIp: { limit: 5, windowSeconds: 900 },
  forgotPasswordPerEmail: { limit: 5, windowSeconds: 3600 },
  resetPasswordPerIp: { limit: 10, windowSeconds: 3600 },
  uploadPerUser: { limit: 30, windowSeconds: 3600 },
} as const;

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

// ~1% of calls sweep windows old enough to be irrelevant to any active limit.
const CLEANUP_PROBABILITY = 0.01;
const CLEANUP_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export async function checkRateLimit(
  key: string,
  config: { limit: number; windowSeconds: number }
): Promise<RateLimitResult> {
  const windowMs = config.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  try {
    const row = await prisma.rateLimitWindow.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart },
      update: { count: { increment: 1 } },
    });

    if (Math.random() < CLEANUP_PROBABILITY) {
      const cutoff = new Date(Date.now() - CLEANUP_MAX_AGE_MS);
      void prisma.rateLimitWindow
        .deleteMany({ where: { windowStart: { lt: cutoff } } })
        .catch((err) => console.error("Rate limit cleanup failed:", err));
    }

    if (row.count > config.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowStart.getTime() + windowMs - Date.now()) / 1000)
      );
      return { allowed: false, retryAfterSeconds };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err) {
    console.error(`Rate limit check failed for key "${key}":`, err);
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/**
 * Client IP for rate-limit keys. On Vercel (and most proxies) the original
 * client is the first entry of x-forwarded-for.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function rateLimitResponse(retryAfterSeconds: number, message?: string) {
  return new Response(
    JSON.stringify({
      error: message ?? "Too many requests. Please try again later.",
      code: "RATE_LIMITED",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}
