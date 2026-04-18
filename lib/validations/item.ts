import { z } from "zod";

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

const externalPlatformSchema = z.enum(["AMAZON", "WALMART", "SHOPIFY", "OTHER"]);

export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  alertEmail: z.string().email("Must be a valid email address"),
  lowStockThreshold: z.number().int().min(1).max(9999).nullable().optional(),
  alertEmailEnabled: z.boolean().optional(),
  externalCartLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  externalPlatform: externalPlatformSchema.nullable().optional(),
});

export const updateItemSchema = createItemSchema.partial().extend({
  labelLayout: labelLayoutSchema.nullable().optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type LabelLayoutInput = z.infer<typeof labelLayoutSchema>;
