import type { Ranking } from "@prisma/client";
import type { Request, Response } from "express";

import type { AuthContext } from "@middleware/auth.middleware";
import * as service from "@services/conduct-score.service";
import { ApiError } from "@utils/ApiError";
import { objectInput, optionalQuery, searchInput, textInput, uuidInput } from "@utils/crudValidation";
import { parsePagination } from "@utils/pagination";

const auth = (res: Response) => (res.locals.auth as AuthContext).sub;
const semesterId = (value: unknown) => uuidInput(value, "semesterId");

function ranking(value: unknown): Ranking {
  if (typeof value !== "string") throw new ApiError(400, "Invalid ranking");
  if (!["EXCELLENT", "GOOD", "FAIR", "AVERAGE", "POOR"].includes(value)) throw new ApiError(400, "Invalid ranking");
  return value as Ranking;
}

export async function list(req: Request, res: Response) {
  const result = await service.listConductScores(auth(res), parsePagination(req.query, { maxOffset: 10000 }), {
    semesterId: semesterId(req.query.semesterId),
    search: optionalQuery(req.query.search, searchInput),
    facultyId: optionalQuery(req.query.facultyId, (value) => uuidInput(value, "facultyId")),
    majorId: optionalQuery(req.query.majorId, (value) => uuidInput(value, "majorId")),
    classId: optionalQuery(req.query.classId, (value) => uuidInput(value, "classId")),
    status: optionalQuery(req.query.status, (value) => {
      if (value !== "DRAFT" && value !== "FINAL") throw new ApiError(400, "Invalid status");
      return value;
    }),
    ranking: optionalQuery(req.query.ranking, ranking),
  });
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function detail(req: Request, res: Response) {
  res.json({ ok: true, data: await service.getConductScore(auth(res), uuidInput(req.params.studentId, "studentId"), semesterId(req.query.semesterId)) });
}

export async function mine(req: Request, res: Response) {
  res.json({ ok: true, data: await service.getMyConductScore(auth(res), semesterId(req.query.semesterId)) });
}

export async function adjustment(req: Request, res: Response) {
  const body = objectInput(req.body);
  const points = Number(body.points);
  if (!Number.isInteger(points) || points === 0 || points < -100 || points > 100) throw new ApiError(400, "points must be a non-zero integer between -100 and 100");
  const reason = textInput(body.reason, "reason", 500);
  if (reason.length < 5) throw new ApiError(400, "reason must contain at least 5 characters");
  res.status(201).json({ ok: true, data: await service.addAdjustment(auth(res), uuidInput(req.params.studentId, "studentId"), {
    semesterId: semesterId(body.semesterId), criteriaId: uuidInput(body.criteriaId, "criteriaId"), points, reason,
  }) });
}

export async function bulkFinalize(req: Request, res: Response) {
  const body = objectInput(req.body);
  const selectedStudentIds = body.studentIds;
  let studentIds: string[] | undefined;
  if (selectedStudentIds !== undefined) {
    if (!Array.isArray(selectedStudentIds) || selectedStudentIds.length === 0 || selectedStudentIds.length > 10_000) {
      throw new ApiError(400, "studentIds must contain between 1 and 10000 items");
    }
    studentIds = [...new Set(selectedStudentIds.map((value) => uuidInput(value, "studentId")))];
  }
  const rawFilters = objectInput(body.filters ?? {});
  const filters: service.ConductScoreFilters = {
    semesterId: semesterId(body.semesterId),
    search: optionalQuery(rawFilters.search, searchInput),
    facultyId: optionalQuery(rawFilters.facultyId, (value) => uuidInput(value, "facultyId")),
    majorId: optionalQuery(rawFilters.majorId, (value) => uuidInput(value, "majorId")),
    classId: optionalQuery(rawFilters.classId, (value) => uuidInput(value, "classId")),
    status: optionalQuery(rawFilters.status, (value) => {
      if (value !== "DRAFT" && value !== "FINAL") throw new ApiError(400, "Invalid status");
      return value;
    }),
    ranking: optionalQuery(rawFilters.ranking, ranking),
  };
  const result = await service.bulkFinalizeConductScores(auth(res), filters, studentIds);
  res.json({ ok: true, data: result });
}

export async function finalize(req: Request, res: Response) {
  const body = objectInput(req.body);
  res.json({ ok: true, data: await service.changeFinalization(auth(res), uuidInput(req.params.studentId, "studentId"), semesterId(body.semesterId), "FINALIZED") });
}

export async function reopen(req: Request, res: Response) {
  const body = objectInput(req.body);
  const reason = textInput(body.reason, "reason", 500);
  if (reason.length < 5) throw new ApiError(400, "reason must contain at least 5 characters");
  res.json({ ok: true, data: await service.changeFinalization(auth(res), uuidInput(req.params.studentId, "studentId"), semesterId(body.semesterId), "REOPENED", reason) });
}
