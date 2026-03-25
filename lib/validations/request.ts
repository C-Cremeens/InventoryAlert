import { z } from "zod";

export const updateRequestStatusSchema = z.object({
  status: z.enum(["APPROVED", "DECLINED"]),
});

export type UpdateRequestStatusInput = z.infer<typeof updateRequestStatusSchema>;
