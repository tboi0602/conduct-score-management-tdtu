import type { Request, Response } from "express";
import * as criteria from "@modules/criteria";
import { ApiError } from "@utils/ApiError";
import { parsePagination } from "@utils/pagination";
import {
  integerInput,
  integerQuery,
  objectInput,
  optionalQuery,
  searchInput,
  textInput,
  uuidInput,
} from "@utils/crudValidation";

function parseInput(req: Request): criteria.CriteriaInput {
  const body = objectInput(req.body);
  const maxPoints = integerInput(body.maxPoints === undefined ? 0 : body.maxPoints, "maxPoints");
  const defaultPoints = integerInput(
    body.defaultPoints === undefined ? 0 : body.defaultPoints,
    "defaultPoints",
  );
  if (defaultPoints > maxPoints) {
    throw new ApiError(400, "defaultPoints must not exceed maxPoints");
  }
  return {
    title: textInput(body.title, "title"),
    maxPoints,
    defaultPoints,
  };
}

export async function listCriteria(req: Request, res: Response): Promise<void> {
  const filters: criteria.CriteriaFilters = {
    search: optionalQuery(req.query.search, searchInput),
    minPoints: optionalQuery(req.query.minPoints, (value) => integerQuery(value, "minPoints")),
    maxPoints: optionalQuery(req.query.maxPoints, (value) => integerQuery(value, "maxPoints")),
  };
  if (
    filters.minPoints !== undefined &&
    filters.maxPoints !== undefined &&
    filters.minPoints > filters.maxPoints
  ) {
    throw new ApiError(400, "minPoints must not exceed maxPoints");
  }
  const result = await criteria.listCriteria(
    parsePagination(req.query, { maxOffset: 10000 }),
    filters,
  );
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function getCriteria(req: Request, res: Response): Promise<void> {
  res.json({
    ok: true,
    data: await criteria.findCriteriaById(uuidInput(req.params.id)),
  });
}

export async function createCriteria(req: Request, res: Response): Promise<void> {
  res.status(201).json({ ok: true, data: await criteria.createCriteria(parseInput(req)) });
}

export async function updateCriteria(req: Request, res: Response): Promise<void> {
  res.json({
    ok: true,
    data: await criteria.updateCriteria(uuidInput(req.params.id), parseInput(req)),
  });
}

export async function deleteCriteria(req: Request, res: Response): Promise<void> {
  await criteria.deleteCriteria(uuidInput(req.params.id));
  res.status(204).end();
}
