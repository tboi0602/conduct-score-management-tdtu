import type { Request, Response } from "express";
import { AttendanceDirection, AttendanceScanStatus, AttendanceStatus } from "@prisma/client";
import type { AuthContext } from "@middleware/auth.middleware";
import { getEventAccess } from "@services/events/event-access.service";
import * as attendance from "@services/attendance/attendance.service";
import * as realtime from "@services/attendance/attendance-realtime.service";
import {
  enumInput,
  objectInput,
  optionalQuery,
  searchInput,
  textInput,
  uuidInput,
} from "@utils/crudValidation";
import { ApiError } from "@utils/ApiError";
import { parsePagination } from "@utils/pagination";

const auth = (res: Response) => res.locals.auth as AuthContext;
const numberField = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new ApiError(400, `${field} must be a number`);
  return value;
};
const coordinates = (body: Record<string, unknown>) => ({
  latitude: numberField(body.latitude, "latitude"),
  longitude: numberField(body.longitude, "longitude"),
  accuracyMeters: numberField(body.accuracyMeters, "accuracyMeters"),
});

export async function openSession(req: Request, res: Response) {
  const body = objectInput(req.body);
  const result = await attendance.openSession(
    await getEventAccess(auth(res).sub),
    uuidInput(req.params.eventId),
    enumInput(body.direction, Object.values(AttendanceDirection), "direction"),
    coordinates(body),
  );
  res.status(201).json({ ok: true, data: result });
}

export async function closeSession(req: Request, res: Response) {
  res.json({
    ok: true,
    data: await attendance.closeSession(
      await getEventAccess(auth(res).sub),
      uuidInput(req.params.eventId),
    ),
  });
}

export async function activeSession(req: Request, res: Response) {
  res.json({
    ok: true,
    data: await attendance.getActiveSession(
      await getEventAccess(auth(res).sub),
      uuidInput(req.params.eventId),
    ),
  });
}

export async function qr(req: Request, res: Response) {
  res.json({
    ok: true,
    data: await attendance.getQr(
      await getEventAccess(auth(res).sub),
      uuidInput(req.params.eventId),
    ),
  });
}

export async function studentQr(req: Request, res: Response) {
  const body = objectInput(req.body);
  const result = await attendance.submitStudentQr(
    auth(res).sub,
    textInput(body.token, "token", 1000),
    coordinates(body),
    uuidInput(body.clientAttemptId, "clientAttemptId"),
  );
  res.status(202).json({ ok: true, data: result });
}

export async function myAttempt(req: Request, res: Response) {
  res.json({
    ok: true,
    data: await attendance.getMyAttempt(
      auth(res).sub,
      uuidInput(req.params.clientAttemptId, "clientAttemptId"),
    ),
  });
}

export async function managedScan(req: Request, res: Response) {
  const body = objectInput(req.body);
  const result = await attendance.submitManagedScan(
    await getEventAccess(auth(res).sub),
    uuidInput(req.params.eventId),
    {
      studentCode: textInput(body.studentCode, "studentCode", 20),
      direction: enumInput(body.direction, Object.values(AttendanceDirection), "direction"),
      source: enumInput(body.source, ["STAFF_BARCODE", "MANUAL_ENTRY"] as const, "source"),
      status: enumInput(body.status ?? "ATTENDED", ["ATTENDED", "LATE"] as const, "status"),
    },
  );
  res.status(202).json({ ok: true, data: result });
}

export async function myRequest(req: Request, res: Response) {
  res.json({
    ok: true,
    data: await attendance.getMyRequest(auth(res).sub, uuidInput(req.params.requestId)),
  });
}

export async function requests(req: Request, res: Response) {
  const result = await attendance.listRequests(
    await getEventAccess(auth(res).sub),
    uuidInput(req.params.eventId),
    parsePagination(req.query, { maxOffset: 10000 }),
    optionalQuery(req.query.search, searchInput),
    optionalQuery(req.query.status, (value) =>
      enumInput(value, Object.values(AttendanceScanStatus), "status"),
    ),
  );
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function adjustStatus(req: Request, res: Response) {
  const body = objectInput(req.body);
  const result = await attendance.adjustAttendanceStatus(
    await getEventAccess(auth(res).sub),
    uuidInput(req.params.eventId),
    uuidInput(req.params.recordId),
    enumInput(body.status, Object.values(AttendanceStatus), "status"),
  );
  res.json({ ok: true, data: result });
}

export async function studentTicket(_req: Request, res: Response) {
  res.status(201).json({ ok: true, data: await realtime.issueStudentTicket(auth(res).sub) });
}

export async function eventTicket(req: Request, res: Response) {
  res.status(201).json({
    ok: true,
    data: await realtime.issueEventTicket(
      await getEventAccess(auth(res).sub),
      uuidInput(req.params.eventId),
    ),
  });
}

export async function stream(req: Request, res: Response) {
  const ticket = typeof req.query.ticket === "string" ? req.query.ticket : "";
  realtime.connectStream(res, await realtime.consumeTicket(ticket));
}
