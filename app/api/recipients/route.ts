import { reportError } from "@/lib/monitoring";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { sendEmail, escapeHtml } from "@/lib/resend";
import { appBaseUrl, lockUser } from "@/lib/security";
import { z } from "zod";

async function configuredEmails(userId: string) {
  const recipients = await prisma.inventoryItemRecipient.findMany({
    where: { item: { userId } },
    select: { inlineEmail: true, contact: { select: { email: true } } },
  });
  return [
    ...new Set(
      recipients
        .map((r) =>
          (r.inlineEmail ?? r.contact?.email ?? "").trim().toLowerCase(),
        )
        .filter(Boolean),
    ),
  ];
}
export async function GET() {
  const session = await auth();
  if (
    !session?.user?.id ||
    !session.user.emailVerifiedAt ||
    !session.user.termsAcceptedAt
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const emails = await configuredEmails(session.user.id);
  const consents = await prisma.recipientConsent.findMany({
    where: { userId: session.user.id },
  });
  return Response.json(
    emails.map((email) => ({
      email,
      verified:
        email === session.user.email.toLowerCase() ||
        !!consents.find((c) => c.email === email)?.verifiedAt,
    })),
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(req: Request) {
  const session = await auth();
  if (
    !session?.user?.id ||
    !session.user.emailVerifiedAt ||
    !session.user.termsAcceptedAt
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z
    .object({
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((v) => v.toLowerCase()),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Invalid email." }, { status: 400 });
  const email = parsed.data.email;
  if (!(await configuredEmails(session.user.id)).includes(email))
    return Response.json({ error: "Recipient not found." }, { status: 404 });
  for (const key of [
    `consent:user:${session.user.id}`,
    `consent:ip:${getClientIp(req)}`,
    `consent:email:${email}`,
  ]) {
    const limit = await checkRateLimit(
      key,
      { limit: 3, windowSeconds: 3600 },
      true,
    );
    if (!limit.allowed) return rateLimitResponse(limit.retryAfterSeconds);
  }
  const token = crypto.randomBytes(32).toString("hex");
  const send = await prisma.$transaction(async (tx) => {
    await lockUser(tx, session.user.id);
    const existing = await tx.recipientConsent.findUnique({
      where: { userId_email: { userId: session.user.id, email } },
    });
    if (
      existing?.verifiedAt ||
      (existing && existing.requestedAt.getTime() > Date.now() - 3600_000)
    )
      return false;
    const data = {
      tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
      tokenExpiry: new Date(Date.now() + 86400_000),
      requestedAt: new Date(),
    };
    await tx.recipientConsent.upsert({
      where: { userId_email: { userId: session.user.id, email } },
      create: { userId: session.user.id, email, ...data },
      update: data,
    });
    return true;
  });
  if (!send)
    return Response.json({
      ok: true,
      message:
        "Already confirmed or recently requested. Please check the recipient's inbox.",
    });
  try {
    await sendEmail({
      to: email,
      subject: "Confirm InventoryAlert notifications",
      html: `<p>${escapeHtml(session.user.email)} would like to send you inventory alerts.</p><p><a href="${escapeHtml(`${appBaseUrl()}/confirm-recipient?token=${token}`)}">Review and confirm</a></p><p>This link expires in 24 hours. Ignore it if you do not want these alerts.</p>`,
    });
    return Response.json({
      ok: true,
      message: "Confirmation email accepted for sending.",
    });
  } catch (error) {
    reportError("Recipient confirmation delivery failed", error);
    return Response.json(
      { error: "Could not send confirmation. Please try again in an hour." },
      { status: 502 },
    );
  }
}
