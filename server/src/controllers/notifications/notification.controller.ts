import type { Request, Response } from "express";

import type { AuthContext } from "@middleware/auth.middleware";
import { validated } from "@middleware/validate.middleware";
import type {
  NotificationIdParams,
  NotificationListQuery,
} from "@modules/notifications/notification.schemas";
import * as notifications from "@services/notifications/notification.service";

const userId = (res: Response) => (res.locals.auth as AuthContext).sub;

export async function mine(req: Request, res: Response) {
  const query = validated<NotificationListQuery>(res, "query");
  const result = await notifications.listMine(userId(res), {
    page: query.page,
    limit: query.limit,
    skip: (query.page - 1) * query.limit,
  });
  res.json({
    ok: true,
    data: result.items,
    unread: result.unread,
    pagination: result.pagination,
  });
}

export async function markRead(req: Request, res: Response) {
  const params = validated<NotificationIdParams>(res, "params");
  res.json({
    ok: true,
    data: await notifications.markRead(userId(res), params.id),
  });
}

export async function markAllRead(_req: Request, res: Response) {
  res.json({ ok: true, data: await notifications.markAllRead(userId(res)) });
}
