import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { AuthProvider } from "@prisma/client";
import { normalizeEmail, registerSchema } from "@/lib/auth-validation";
import { ensureCredentialsIdentity } from "@/lib/auth-identities";
import {
  RATE_LIMITS,
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

const TERMS_VERSION = "2026-04-18";

export async function POST(req: NextRequest) {
  try {
    const limit = await checkRateLimit(
      `register:ip:${getClientIp(req)}`,
      RATE_LIMITS.registerPerIp
    );
    if (!limit.allowed) {
      return rateLimitResponse(
        limit.retryAfterSeconds,
        "Too many registration attempts. Please try again later."
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          error: parsed.error.issues[0].message,
          fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = normalizeEmail(email);

    const existing = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      include: {
        authIdentities: {
          select: { provider: true },
        },
      },
    });
    if (existing) {
      const usesGoogleOnly =
        !existing.hashedPassword &&
        existing.authIdentities.some(
          (identity) => identity.provider === AuthProvider.GOOGLE
        );

      return NextResponse.json(
        {
          error: usesGoogleOnly
            ? "An account with this email already uses Google sign-in. Continue with Google or use Forgot password to create a password."
            : "An account with this email already exists. Sign in instead.",
        },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        hashedPassword,
        name,
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
      },
    });
    await ensureCredentialsIdentity(user.id);

    return NextResponse.json({ ok: true, email: normalizedEmail }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
