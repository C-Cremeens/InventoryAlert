import { z } from "zod";
export function isPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.port &&
      !url.username &&
      !url.password &&
      !url.hash &&
      (url.hostname === "fcm.googleapis.com" ||
        url.hostname === "updates.push.services.mozilla.com" ||
        url.hostname === "web.push.apple.com" ||
        /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname))
    );
  } catch {
    return false;
  }
}
const key = (bytes: number) =>
  z
    .string()
    .max(200)
    .regex(/^[A-Za-z0-9_-]+={0,2}$/)
    .refine(
      (v) => Buffer.from(v, "base64url").length === bytes,
      "Invalid push key",
    );
export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .max(2048)
    .refine(isPushEndpoint, "Unsupported push service"),
  keys: z.object({
    p256dh: key(65).refine((v) => Buffer.from(v, "base64url")[0] === 4),
    auth: key(16),
  }),
});
