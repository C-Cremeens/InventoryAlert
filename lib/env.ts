import { z } from "zod";

/**
 * Validates server environment configuration at startup (via instrumentation.ts).
 *
 * - Required vars missing in production → throw, so a misconfigured deploy fails
 *   fast instead of erroring on the first user request.
 * - In development, problems are logged as warnings so local work isn't blocked.
 * - Optional feature groups (Stripe, web push, Google OAuth) are validated for
 *   partial configuration, which is almost always a deploy mistake.
 */

const requiredSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  NEXT_PUBLIC_BASE_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z.string().email(),
});

// Feature groups: either every var in the group is set, or none are.
const OPTIONAL_GROUPS: Record<string, string[]> = {
  Stripe: ["STRIPE_SECRET_KEY", "STRIPE_PRICE_PRO", "STRIPE_WEBHOOK_SECRET"],
  "Web push (VAPID)": [
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
  ],
  "Google OAuth": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
};

const PRODUCTION_RECOMMENDED = ["BLOB_READ_WRITE_TOKEN"];

export function validateEnv(): void {
  const problems: string[] = [];
  const warnings: string[] = [];

  const parsed = requiredSchema.safeParse(process.env);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      problems.push(`${issue.path.join(".")}: ${issue.message}`);
    }
  }

  for (const [group, vars] of Object.entries(OPTIONAL_GROUPS)) {
    const set = vars.filter((v) => process.env[v]);
    if (set.length > 0 && set.length < vars.length) {
      const missing = vars.filter((v) => !process.env[v]);
      problems.push(
        `${group} is partially configured — missing: ${missing.join(", ")}`
      );
    }
  }

  for (const v of PRODUCTION_RECOMMENDED) {
    if (!process.env[v]) {
      warnings.push(`${v} is not set — image uploads will fail`);
    }
  }

  for (const warning of warnings) {
    console.warn(`[env] warning: ${warning}`);
  }

  if (problems.length === 0) return;

  const message = `Invalid environment configuration:\n${problems
    .map((p) => `  - ${p}`)
    .join("\n")}`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  }

  console.warn(`[env] ${message}`);
}
