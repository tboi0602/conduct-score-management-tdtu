import type { Request, Response } from "express";
import { AttendanceDirection, AttendanceScanStatus, AttendanceStatus } from "@prisma/client";
import type { AuthContext } from "@middleware/auth.middleware";
import { getEventAccess } from "@services/events/event-access.service";
import * as attendance from "@services/attendance/attendance.service";
import * as realtime from "@services/attendance/attendance-realtime.service";
import * as reconciliation from "@services/attendance/attendance-reconciliation.service";
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

export async function bulkImport(req: Request, res: Response) {
  const body = objectInput(req.body);
  if (!Array.isArray(body.studentCodes)) {
    throw new ApiError(400, "studentCodes must be an array");
  }
  const studentCodes = body.studentCodes.map((value) => textInput(value, "studentCode", 20));
  const result = await attendance.submitBulkImport(
    await getEventAccess(auth(res).sub),
    uuidInput(req.params.eventId),
    {
      studentCodes,
      direction: enumInput(body.direction, Object.values(AttendanceDirection), "direction"),
      status: enumInput(body.status ?? "ATTENDED", ["ATTENDED", "LATE"] as const, "status"),
    },
  );
  res.status(202).json({ ok: true, data: result });
}

export async function submitIncident(req: Request, res: Response) {
  const body = objectInput(req.body);
  const nullableNumber = (value: unknown, field: string) =>
    value === null || value === undefined ? null : numberField(value, field);
  const direction =
    body.direction === null || body.direction === undefined
      ? null
      : enumInput(body.direction, Object.values(AttendanceDirection), "direction");
  const payload = {
    clientAttemptId: uuidInput(body.clientAttemptId, "clientAttemptId"),
    eventId: uuidInput(body.eventId, "eventId"),
    direction,
    failureCategory: enumInput(
      body.failureCategory,
      [
        "NETWORK_ERROR",
        "QR_ERROR",
        "SESSION_EXPIRED",
        "TIMEOUT",
        "LOCATION_ERROR",
        "SERVICE_ERROR",
        "OTHER",
      ] as const,
      "failureCategory",
    ),
    failedAt: textInput(body.failedAt, "failedAt", 50),
    latitude: nullableNumber(body.latitude, "latitude"),
    longitude: nullableNumber(body.longitude, "longitude"),
    accuracyMeters: nullableNumber(body.accuracyMeters, "accuracyMeters"),
    tokenFingerprint:
      body.tokenFingerprint == null
        ? null
        : textInput(body.tokenFingerprint, "tokenFingerprint", 64),
    clientOnline: Boolean(body.clientOnline),
    userAgent: body.userAgent == null ? null : textInput(body.userAgent, "userAgent", 500),
  };
  if (!Number.isFinite(new Date(payload.failedAt).getTime()))
    throw new ApiError(400, "failedAt must be a valid date");
  const data = await reconciliation.submitIncident(
    auth(res).sub,
    payload,
    textInput(body.digest, "digest", 64),
  );
  res.status(201).json({ ok: true, data });
}

export async function reconciliationList(req: Request, res: Response) {
  const state = optionalQuery(req.query.state, (value) =>
    enumInput(value, ["MATCHED", "CLIENT_ONLY", "SERVER_ONLY", "RESOLVED"] as const, "state"),
  );
  const result = await reconciliation.listReconciliation(
    await getEventAccess(auth(res).sub),
    uuidInput(req.params.eventId),
    parsePagination(req.query, { maxOffset: 10000 }),
    optionalQuery(req.query.search, searchInput) ?? "",
    state,
  );
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function resolveIncident(req: Request, res: Response) {
  const body = objectInput(req.body);
  res.json({
    ok: true,
    data: await reconciliation.resolveIncident(
      await getEventAccess(auth(res).sub),
      uuidInput(req.params.eventId),
      uuidInput(req.params.incidentId),
      textInput(body.note, "note", 1000),
    ),
  });
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
