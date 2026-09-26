import type { Request, Response } from "express";
import { ScheduleExceptionStatus } from "@prisma/client";

import type { AuthContext } from "@middleware/auth.middleware";
import * as schedules from "@services/schedules/schedule.service";
import { ApiError } from "@utils/ApiError";
import { enumInput, integerInput, objectInput, uuidInput } from "@utils/crudValidation";

const auth = (res: Response) => res.locals.auth as AuthContext;
const queryText = (value: unknown, name: string) => {
  if (typeof value !== "string" || !value) throw new ApiError(400, `${name} is required`);
  return value;
};
const arrayInput = (value: unknown, name: string): unknown[] => {
  if (!Array.isArray(value)) throw new ApiError(400, `${name} must be an array`);
  return value;
};

export async function getMine(req: Request, res: Response) {
  const semesterId = uuidInput(queryText(req.query.semesterId, "semesterId"), "semesterId");
  res.json({ ok: true, data: await schedules.getMySchedule(auth(res).sub, semesterId) });
}

export async function replaceMine(req: Request, res: Response) {
  const body = objectInput(req.body);
  const semesterId = uuidInput(body.semesterId, "semesterId");
  const slots = arrayInput(body.slots, "slots").map((value) => {
    const slot = objectInput(value);
    return {
      dayOfWeek: integerInput(slot.dayOfWeek, "dayOfWeek"),
      classSessionId: uuidInput(slot.classSessionId, "classSessionId"),
    };
  });
  res.json({ ok: true, data: await schedules.replaceMySchedule(auth(res).sub, semesterId, slots) });
}

export async function getWeek(req: Request, res: Response) {
  const semesterId = uuidInput(queryText(req.query.semesterId, "semesterId"), "semesterId");
  const weekStart = queryText(req.query.weekStart, "weekStart");
  res.json({ ok: true, data: await schedules.getMyWeek(auth(res).sub, semesterId, weekStart) });
}

export async function replaceWeek(req: Request, res: Response) {
  const body = objectInput(req.body);
  const semesterId = uuidInput(body.semesterId, "semesterId");
  const weekStart = queryText(body.weekStart, "weekStart");
  const exceptions = arrayInput(body.exceptions, "exceptions").map((value) => {
    const item = objectInput(value);
    return {
      date: queryText(item.date, "date"),
      classSessionId: uuidInput(item.classSessionId, "classSessionId"),
      status: enumInput(item.status, Object.values(ScheduleExceptionStatus), "status"),
    };
  });
  res.json({
    ok: true,
    data: await schedules.replaceMyWeek(auth(res).sub, semesterId, weekStart, exceptions),
  });
}
