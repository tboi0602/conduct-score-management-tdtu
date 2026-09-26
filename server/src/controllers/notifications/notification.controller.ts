import type { Request, Response } from "express";

import type { AuthContext } from "@middleware/auth.middleware";
import * as notifications from "@services/notifications/notification.service";
import { uuidInput } from "@utils/crudValidation";
import { parsePagination } from "@utils/pagination";

const userId = (res: Response) => (res.locals.auth as AuthContext).sub;

export async function mine(req: Request, res: Response) {
  const result = await notifications.listMine(userId(res), parsePagination(req.query));
  res.json({
    ok: true,
    data: result.items,
    unread: result.unread,
    pagination: result.pagination,
  });
}

export async function markRead(req: Request, res: Response) {
  res.json({
    ok: true,
    data: await notifications.markRead(userId(res), uuidInput(req.params.id)),
  });
}

export async function markAllRead(_req: Request, res: Response) {
  res.json({ ok: true, data: await notifications.markAllRead(userId(res)) });
}
