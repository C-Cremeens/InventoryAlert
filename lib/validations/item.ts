import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  alertEmail: z.string().email("Must be a valid email address"),
  lowStockThreshold: z.number().int().min(1).max(9999).nullable().optional(),
  alertEmailEnabled: z.boolean().optional(),
});

export const updateItemSchema = createItemSchema.partial();

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
