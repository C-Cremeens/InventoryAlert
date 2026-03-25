import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
