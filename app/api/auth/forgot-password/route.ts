import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/resend";
import { normalizeEmail } from "@/lib/auth-validation";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: tokenHash, passwordResetExpiry: expiry },
      });

      const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/reset-password?token=${rawToken}`;
      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch {
        // Log but don't expose email delivery failures
        console.error("Failed to send password reset email to", user.email);
      }
    }

    // Always return 200 to prevent user enumeration
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
