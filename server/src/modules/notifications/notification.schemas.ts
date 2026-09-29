import { z } from "zod";

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const notificationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
export type NotificationIdParams = z.infer<typeof notificationIdParamsSchema>;
