import { z } from "zod";
import { alertContactSchema } from "./contact";

const textElementSchema = z.object({
  id: z.string(),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  fontSize: z.number(),
  bold: z.boolean(),
});

const labelLayoutSchema = z.object({
  size: z.enum(["3x1", "2x1", "1x1"]),
  qrPosition: z.enum(["left", "center", "right"]),
  elements: z.array(textElementSchema),
});

export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  alertEmail: z.string().trim().email("Must be a valid email address").optional(),
  lowStockThreshold: z.number().int().min(1).max(9999).nullable().optional(),
  alertEmailEnabled: z.boolean().optional(),
  scanCooldownMinutes: z.number().int().min(1).max(1440).optional(),
  scanAcknowledgement: z.string().max(280).optional(),
  alertRecipients: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        kind: z.literal("CONTACT"),
        contactId: z.string().min(1),
      }),
      z.object({
        kind: z.literal("INLINE_EMAIL"),
        email: z.string().trim().email("Must be a valid email address"),
      }),
      z.object({
        kind: z.literal("NEW_CONTACT"),
        name: alertContactSchema.shape.name,
        email: alertContactSchema.shape.email,
        cellPhone: alertContactSchema.shape.cellPhone,
        emailEnabled: z.boolean().optional(),
        smsOptIn: z.boolean().optional(),
      }),
    ])
  ).optional(),
});

export const updateItemSchema = createItemSchema.partial().extend({
  labelLayout: labelLayoutSchema.nullable().optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type LabelLayoutInput = z.infer<typeof labelLayoutSchema>;
export type ItemAlertRecipientInput = NonNullable<CreateItemInput["alertRecipients"]>[number];
