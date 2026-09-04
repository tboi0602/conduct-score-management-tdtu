import type { Request, Response } from "express";

import { getAcademicOptions as loadAcademicOptions } from "@services/academic.service";

export async function getAcademicOptions(
  _req: Request,
  res: Response,
): Promise<void> {
  res.json({ ok: true, data: await loadAcademicOptions() });
}
