import type { Request, Response } from "express";
import { SemesterType } from "@prisma/client";
import * as semesters from "@services/semester.service";
import { enumInput, integerInput, integerQuery, objectInput, optionalQuery, uuidInput } from "@utils/crudValidation";
import { parsePagination } from "@utils/pagination";
import { ApiError } from "@utils/ApiError";

function parseYear(value: unknown): number {
  const year = integerInput(value, "year");
  if (year < 2000 || year > 2100) throw new ApiError(400, "year must be between 2000 and 2100");
  return year;
}

function parseInput(req: Request): semesters.SemesterInput {
  const body = objectInput(req.body);
  return {
    year: parseYear(body.year),
    type: enumInput(body.type, Object.values(SemesterType), "type"),
  };
}

export async function list(req: Request, res: Response) {
  const year = optionalQuery(req.query.year, (value) => integerQuery(value, "year"));
  if (year !== undefined && (year < 2000 || year > 2100)) {
    throw new ApiError(400, "year must be between 2000 and 2100");
  }
  const result = await semesters.listSemesters(parsePagination(req.query, { maxOffset: 10000 }), {
    year,
    type: optionalQuery(req.query.type, (value) => enumInput(value, Object.values(SemesterType), "type")),
  });
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function create(req: Request, res: Response) {
  res.status(201).json({ ok: true, data: await semesters.createSemester(parseInput(req)) });
}

export async function update(req: Request, res: Response) {
  res.json({ ok: true, data: await semesters.updateSemester(uuidInput(req.params.id), parseInput(req)) });
}

export async function remove(req: Request, res: Response) {
  await semesters.deleteSemester(uuidInput(req.params.id));
  res.status(204).end();
}
