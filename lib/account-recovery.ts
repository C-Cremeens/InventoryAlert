import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/resend";
import { appBaseUrl } from "@/lib/security";

export async function sendAccountRecovery(user: {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
}) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex"),
      passwordResetExpiry: new Date(Date.now() + 3600_000),
    },
  });
  const url = `${appBaseUrl()}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(user.email, url, !user.emailVerifiedAt);
}
