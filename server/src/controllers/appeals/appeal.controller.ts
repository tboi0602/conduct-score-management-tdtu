import { AttendanceAppealStatus, AttendanceFailureCategory } from "@prisma/client";
import type { Request, Response } from "express";

import type { AuthContext } from "@middleware/auth.middleware";
import { getEventAccess } from "@services/events/event-access.service";
import * as appeals from "@modules/appeals";
import { createEvidenceUpload } from "@modules/appeals";
import {
  enumInput,
  integerInput,
  objectInput,
  optionalQuery,
  searchInput,
  textInput,
  uuidInput,
} from "@utils/crudValidation";
import { parsePagination } from "@utils/pagination";
import { ApiError } from "@utils/ApiError";

const userId = (res: Response) => (res.locals.auth as AuthContext).sub;

export async function upload(req: Request, res: Response) {
  const body = objectInput(req.body);
  res.json({
    ok: true,
    data: await createEvidenceUpload(userId(res), textInput(body.mime, "mime")),
  });
}
export async function eligible(_req: Request, res: Response) {
  res.json({ ok: true, data: await appeals.eligibleEvents(userId(res)) });
}
export async function create(req: Request, res: Response) {
  const body = objectInput(req.body);
  const explanation = textInput(body.explanation, "explanation", 2000);
  if (explanation.length < 20)
    throw new ApiError(400, "explanation must contain at least 20 characters");
  res.status(201).json({
    ok: true,
    data: await appeals.createAppeal(userId(res), {
      eventId: uuidInput(body.eventId, "eventId"),
      explanation,
      failureCategory:
        body.failureCategory === undefined
          ? undefined
          : enumInput(
              body.failureCategory,
              Object.values(AttendanceFailureCategory),
              "failureCategory",
            ),
      failedAt:
        body.failedAt === undefined
          ? undefined
          : (() => {
              const date = new Date(textInput(body.failedAt, "failedAt", 50));
              if (Number.isNaN(date.getTime())) throw new ApiError(400, "failedAt is invalid");
              return date;
            })(),
      evidenceKey: textInput(body.evidenceKey, "evidenceKey", 500),
      evidenceName: textInput(body.evidenceName, "evidenceName", 255),
      evidenceMime: textInput(body.evidenceMime, "evidenceMime", 50),
      evidenceSize: integerInput(body.evidenceSize, "evidenceSize"),
    }),
  });
}
export async function mine(req: Request, res: Response) {
  const result = await appeals.listMine(userId(res), parsePagination(req.query));
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}
export async function ownEvidence(req: Request, res: Response) {
  res.json({
    ok: true,
    data: { url: await appeals.ownEvidence(uuidInput(req.params.id), userId(res)) },
  });
}
export async function list(req: Request, res: Response) {
  const result = await appeals.listManaged(
    await getEventAccess(userId(res)),
    parsePagination(req.query, { maxOffset: 10000 }),
    optionalQuery(req.query.status, (value) =>
      enumInput(value, Object.values(AttendanceAppealStatus), "status"),
    ),
    optionalQuery(req.query.search, searchInput),
  );
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}
export async function detail(req: Request, res: Response) {
  res.json({
    ok: true,
    data: await appeals.managedDetail(uuidInput(req.params.id), await getEventAccess(userId(res))),
  });
}
export async function evidence(req: Request, res: Response) {
  res.json({
    ok: true,
    data: {
      url: await appeals.managedEvidence(
        uuidInput(req.params.id),
        await getEventAccess(userId(res)),
      ),
    },
  });
}
export async function review(req: Request, res: Response) {
  const body = objectInput(req.body);
  res.json({
    ok: true,
    data: await appeals.reviewAppeal(
      uuidInput(req.params.id),
      await getEventAccess(userId(res)),
      enumInput(body.decision, ["APPROVED", "REJECTED"] as const, "decision"),
      typeof body.reviewNote === "string" ? body.reviewNote : undefined,
    ),
  });
}
