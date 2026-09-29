import type { Request, Response } from "express";
import { listSemesterOptions } from "@services/events/event-options.service";
import { listCriteria } from "@modules/criteria";
import { integerQuery, optionalQuery, searchInput } from "@utils/crudValidation";
import { parsePagination } from "@utils/pagination";

export async function getSemesterOptions(req: Request, res: Response): Promise<void> {
  const year = optionalQuery(req.query.year, (value) => integerQuery(value, "year"));
  const result = await listSemesterOptions(parsePagination(req.query, { maxOffset: 10000 }), year);
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function getCriteriaOptions(req: Request, res: Response): Promise<void> {
  const search = optionalQuery(req.query.search, searchInput);
  const result = await listCriteria(parsePagination(req.query, { maxOffset: 10000 }), { search });
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}
