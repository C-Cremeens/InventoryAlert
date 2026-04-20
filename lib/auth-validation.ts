import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

const LOWERCASE_REGEX = /[a-z]/;
const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_CHARACTER_REGEX = /[^A-Za-z0-9]/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeOptionalName(value: unknown) {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
  )
  .regex(LOWERCASE_REGEX, "Password must include at least one lowercase letter.")
  .regex(UPPERCASE_REGEX, "Password must include at least one uppercase letter.")
  .regex(NUMBER_REGEX, "Password must include at least one number.")
  .regex(
    SPECIAL_CHARACTER_REGEX,
    "Password must include at least one special character."
  );

export const registerSchema = z
  .object({
    name: z.preprocess(
      normalizeOptionalName,
      z.string().max(100, "Name must be 100 characters or fewer.").optional()
    ),
    email: z
      .string()
      .trim()
      .min(1, "Email is required.")
      .email("Enter a valid email address."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password."),
    termsAccepted: z
      .boolean()
      .refine((value) => value, {
        message: "You must accept the Terms of Service to create an account.",
      }),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Invalid reset link."),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function getPasswordRequirementStates(password: string) {
  return [
    {
      id: "length",
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: "lowercase",
      label: "At least one lowercase letter",
      met: LOWERCASE_REGEX.test(password),
    },
    {
      id: "uppercase",
      label: "At least one uppercase letter",
      met: UPPERCASE_REGEX.test(password),
    },
    {
      id: "number",
      label: "At least one number",
      met: NUMBER_REGEX.test(password),
    },
    {
      id: "special",
      label: "At least one special character",
      met: SPECIAL_CHARACTER_REGEX.test(password),
    },
  ];
}
