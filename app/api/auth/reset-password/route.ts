import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureCredentialsIdentity } from "@/lib/auth-identities";
import { resetPasswordSchema } from "@/lib/auth-validation";
import {
  RATE_LIMITS,
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Caps brute-force guessing of reset tokens.
    const limit = await checkRateLimit(
      `reset-password:ip:${getClientIp(req)}`,
      RATE_LIMITS.resetPasswordPerIp,
      true,
    );
    if (!limit.allowed) {
      return rateLimitResponse(
        limit.retryAfterSeconds,
        "Too many attempts. Please try again later.",
      );
    }

    const body = await req.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          error: parsed.error.issues[0].message,
          fieldErrors,
        },
        { status: 400 },
      );
    }

    const { token, password } = parsed.data;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset link." },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const consumed = await prisma.user.updateMany({
      where: {
        id: user.id,
        passwordResetToken: tokenHash,
        passwordResetExpiry: { gt: new Date() },
      },
      data: {
        hashedPassword,
        emailVerifiedAt: new Date(),
        sessionVersion: { increment: 1 },
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });
    if (consumed.count !== 1) {
      return NextResponse.json(
        { error: "Invalid or expired reset link." },
        { status: 400 },
      );
    }
    await ensureCredentialsIdentity(user.id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
