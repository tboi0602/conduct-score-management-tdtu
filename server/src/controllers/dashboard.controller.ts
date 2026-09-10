import type { Request, Response } from "express";
import type { AuthContext } from "@middleware/auth.middleware";
import { getDashboardInsights } from "@services/dashboard-insights.service";
import { optionalQuery, uuidInput } from "@utils/crudValidation";

export async function summary(req: Request, res: Response) {
  const auth = res.locals.auth as AuthContext;
  const semesterId = optionalQuery(req.query.semesterId, (value) => uuidInput(value, "semesterId"));
  res.json({ ok: true, data: await getDashboardInsights(auth.sub, semesterId) });
}
