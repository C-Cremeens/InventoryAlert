import { prisma } from "@/lib/prisma";

/**
 * DB-backed fixed-window rate limiter. Counters live in Postgres
 * (RateLimitWindow) so limits hold across serverless function instances —
 * an in-memory limiter would reset on every cold start.
 *
 * Security-sensitive callers pass failClosed=true. Cleanup is performed by
 * the authenticated maintenance job, not fire-and-forget request work.
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

export async function checkRateLimit(
  key: string,
  config: { limit: number; windowSeconds: number },
  failClosed = false,
): Promise<RateLimitResult> {
  const windowMs = config.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);

  try {
    const row = await prisma.rateLimitWindow.upsert({
      where: { key_windowStart: { key, windowStart } },
      create: { key, windowStart },
      update: { count: { increment: 1 } },
    });

    if (row.count > config.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowStart.getTime() + windowMs - Date.now()) / 1000),
      );
      return { allowed: false, retryAfterSeconds };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  } catch (err) {
    console.error(`Rate limit check failed for key "${key}":`, err);
    return { allowed: !failClosed, retryAfterSeconds: failClosed ? 60 : 0 };
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
    },
  );
}
