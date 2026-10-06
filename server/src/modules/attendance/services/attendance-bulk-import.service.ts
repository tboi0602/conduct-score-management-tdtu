import { randomUUID } from "crypto";
import type { AttendanceDirection } from "@prisma/client";

import { prisma } from "@config/prisma";
import { attendanceScanRequestsTotal } from "@metrics";
import {
  assertAttendanceStarted,
  managedEvent,
  outboxData,
} from "@modules/attendance/services/attendance-session.service";
import { attendanceRoutingKeys } from "@producers/attendance.producer";
import { rabbitClient } from "@rabbitmq";
import { redisClient } from "@redis";
import type { EventAccess } from "@services/events/event-access.service";
import { ApiError } from "@utils/ApiError";
const BULK_IMPORT_LIMIT = 5_000;
const BULK_IMPORT_BATCH_SIZE = 250;

export async function submitBulkImport(
  access: EventAccess,
  eventId: string,
  input: {
    studentCodes: string[];
    direction: AttendanceDirection;
    status: "ATTENDED" | "LATE";
  },
) {
  const event = await managedEvent(eventId, access);
  assertAttendanceStarted(event);
  if (event.deliveryMode !== "ONLINE") {
    throw new ApiError(409, "Bulk attendance import is only available for online events");
  }
  if (event.checkInMode === "ONE_WAY" && input.direction === "CHECK_OUT") {
    throw new ApiError(409, "One-way events do not support check-out");
  }
  if (redisClient.getClient().status !== "ready" || !rabbitClient.isConnected()) {
    throw new ApiError(503, "Attendance processing service is temporarily unavailable");
  }

  const normalized = input.studentCodes.map((code) => code.trim().toUpperCase()).filter(Boolean);
  if (!normalized.length) throw new ApiError(400, "studentCodes must not be empty");
  if (normalized.length > BULK_IMPORT_LIMIT) {
    throw new ApiError(400, `studentCodes must contain at most ${BULK_IMPORT_LIMIT} items`);
  }
  if (normalized.some((code) => code.length > 20)) {
    throw new ApiError(400, "studentCodes contains an invalid student code");
  }
  const counts = new Map<string, number>();
  normalized.forEach((code) => counts.set(code, (counts.get(code) ?? 0) + 1));
  const uniqueCodes = [...counts.keys()];
  const duplicateCodes = uniqueCodes.filter((code) => (counts.get(code) ?? 0) > 1);
  const students = await prisma.student.findMany({
    where: { studentCode: { in: uniqueCodes } },
    select: { id: true, studentCode: true },
  });
  const foundCodes = new Set(students.map((student) => student.studentCode));
  const notFoundCodes = uniqueCodes.filter((code) => !foundCodes.has(code));
  const occurredAt = new Date().toISOString();
  const rows = students.map((student) => ({
    requestId: randomUUID(),
    correlationId: randomUUID(),
    student,
  }));

  await prisma.$transaction(async (tx) => {
    for (let offset = 0; offset < rows.length; offset += BULK_IMPORT_BATCH_SIZE) {
      const batch = rows.slice(offset, offset + BULK_IMPORT_BATCH_SIZE);
      await tx.attendanceScanRequest.createMany({
        data: batch.map(({ requestId, correlationId, student }) => ({
          id: requestId,
          eventId,
          studentId: student.id,
          submittedByUserId: access.userId,
          direction: input.direction,
          source: "BULK_IMPORT",
          requestedStatus: input.status,
          correlationId,
        })),
      });
      await tx.outboxEvent.createMany({
        data: batch.map(({ requestId, correlationId, student }) =>
          outboxData(requestId, attendanceRoutingKeys.scanRequested, correlationId, {
            schemaVersion: 1,
            requestId,
            eventId,
            sessionId: null,
            studentId: student.id,
            direction: input.direction,
            source: "BULK_IMPORT",
            occurredAt,
            correlationId,
          }),
        ),
      });
    }
  });
  if (rows.length) {
    attendanceScanRequestsTotal.inc(
      { source: "BULK_IMPORT", direction: input.direction },
      rows.length,
    );
  }
  return {
    requested: normalized.length,
    queued: rows.length,
    duplicateCodes,
    notFoundCodes,
  };
}
