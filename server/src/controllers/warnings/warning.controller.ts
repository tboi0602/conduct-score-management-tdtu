import type { Request, Response } from "express";
import type { AuthContext } from "@middleware/auth.middleware";
import { listActiveForUser } from "@services/warnings/warning.service";

export async function mine(_req: Request, res: Response) {
  const auth = res.locals.auth as AuthContext;
  res.json({ ok: true, data: await listActiveForUser(auth.sub) });
}
