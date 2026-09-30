import { reportError } from "@/lib/monitoring";
import { NextRequest, NextResponse } from "next/server";
import { sendAccountRecovery } from "@/lib/account-recovery";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/auth-validation";
import {
  RATE_LIMITS,
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const ipLimit = await checkRateLimit(
      `forgot-password:ip:${getClientIp(req)}`,
      RATE_LIMITS.forgotPasswordPerIp,
      true,
    );
    if (!ipLimit.allowed) {
      return rateLimitResponse(
        ipLimit.retryAfterSeconds,
        "Too many password reset requests. Please try again later.",
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);

    // Also cap per target address across all IPs so a distributed attacker
    // can't bombard one inbox with reset emails.
    const emailLimit = await checkRateLimit(
      `forgot-password:email:${normalizedEmail}`,
      RATE_LIMITS.forgotPasswordPerEmail,
      true,
    );
    if (!emailLimit.allowed) {
      // Same body as the success path — a distinct error here would allow
      // user enumeration; suppressing the send is enough.
      return NextResponse.json({ ok: true });
    }
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });

    if (user) {
      try {
        await sendAccountRecovery(user);
      } catch (error) {
        reportError("Account recovery delivery failed", error);
      }
    }

    // Always return 200 to prevent user enumeration
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
