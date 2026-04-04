import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: "Reset your InventoryAlert password",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Reset Your Password</h2>
        <p>We received a request to reset the password for your InventoryAlert account.</p>
        <p>Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display: inline-block; margin: 16px 0; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">Reset Password</a>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">This email was sent automatically by InventoryAlert.</p>
      </div>
    `,
  });
}

export async function sendAlertEmail(to: string, itemName: string): Promise<void> {
  const now = new Date().toLocaleString("en-US", { timeZone: "UTC" });
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to,
    subject: `Low Stock Alert: ${itemName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Low Stock Alert</h2>
        <p>A low stock alert was triggered for <strong>${itemName}</strong>.</p>
        <p>A QR code was scanned at <strong>${now} UTC</strong>, indicating that this item may need restocking.</p>
        <p>Please log in to your InventoryAlert dashboard to review and action the stocking request.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">This alert was sent automatically by InventoryAlert.</p>
      </div>
    `,
  });
}
