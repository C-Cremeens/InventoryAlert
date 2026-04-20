import { z } from "zod";

const optionalTrimmedString = z.string().trim().optional().or(z.literal(""));

export const alertContactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Must be a valid email address"),
  cellPhone: optionalTrimmedString
    .transform((value) => value?.trim() || undefined)
    .refine((value) => !value || value.length <= 30, "Cell phone must be 30 characters or fewer"),
  emailEnabled: z.boolean().optional(),
  smsOptIn: z.boolean().optional(),
});

export const updateAlertContactSchema = alertContactSchema.partial();

export type AlertContactInput = z.infer<typeof alertContactSchema>;
export type UpdateAlertContactInput = z.infer<typeof updateAlertContactSchema>;
