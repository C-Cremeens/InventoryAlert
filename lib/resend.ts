import { Resend } from "resend";
let client: Resend | undefined;
const getClient = () => (client ??= new Resend(process.env.RESEND_API_KEY));

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey?: string;
}) {
  const { data, error } = await getClient().emails.send(
    {
      from: process.env.RESEND_FROM_EMAIL!,
      to: args.to,
      subject: args.subject,
      html: args.html,
    },
    args.idempotencyKey ? { idempotencyKey: args.idempotencyKey } : undefined,
  );
  if (error || !data?.id)
    throw new Error(
      `Email provider rejected request: ${error?.name ?? "missing_message_id"}`,
    );
  return data.id; // Accepted by provider, not a claim of inbox delivery.
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  verification = false,
) {
  return sendEmail({
    to,
    subject: verification
      ? "Verify your InventoryAlert account"
      : "Reset your InventoryAlert password",
    html: `<h2>${verification ? "Verify your email and choose your password" : "Reset your password"}</h2><p>This link expires in one hour. Completing it signs out existing sessions.</p><p><a href="${escapeHtml(resetUrl)}">${verification ? "Verify account" : "Choose a new password"}</a></p><p>If you did not request this, ignore this email.</p>`,
  });
}

export async function sendAlertEmail(
  to: string,
  itemName: string,
  idempotencyKey?: string,
) {
  return sendEmail({
    to,
    idempotencyKey,
    subject: `Low Stock Alert: ${itemName}`,
    html: `<h2>Low stock report</h2><p>A low-stock report was submitted for <strong>${escapeHtml(itemName)}</strong>.</p><p>Please review your InventoryAlert dashboard.</p>`,
  });
}
