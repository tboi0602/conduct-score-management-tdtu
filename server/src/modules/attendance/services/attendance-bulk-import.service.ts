import { createHash, randomUUID } from "crypto";
import { prisma } from "@config/prisma";
import { attendanceScanRequestsTotal } from "@metrics";
import { managedEvent, outboxData } from "@modules/attendance/services/attendance-session.service";
import { attendanceRoutingKeys } from "@producers/attendance.producer";
import { rabbitClient } from "@rabbitmq";
import { redisClient } from "@redis";
import type { EventAccess } from "@services/events/event-access.service";
import { ApiError } from "@utils/ApiError";
const BULK_IMPORT_LIMIT = 5_000;
const BULK_IMPORT_BATCH_SIZE = 250;
const STUDENT_EMAIL_SUFFIX = "@student.tdtu.edu.vn";

type Identifier =
  | { raw: string; key: string; email: string; studentCode?: never }
  | { raw: string; key: string; email?: never; studentCode: string };

function normalizeIdentifier(value: string): Identifier | null {
  const raw = value.trim();
  if (!raw) return null;
  if (raw.includes("@")) {
    const email = raw.toLowerCase();
    if (
      email.length > 150 ||
      !email.endsWith(STUDENT_EMAIL_SUFFIX) ||
      email.slice(0, -STUDENT_EMAIL_SUFFIX.length).length === 0 ||
      email.slice(0, -STUDENT_EMAIL_SUFFIX.length).includes("@")
    ) {
      return null;
    }
    return { raw, key: `email:${email}`, email };
  }
  const studentCode = raw.toUpperCase();
  if (studentCode.length > 20 || !/^[A-Z0-9]+$/.test(studentCode)) return null;
  return { raw, key: `code:${studentCode}`, studentCode };
}

function bulkImportAttemptId(eventId: string, studentId: string): string {
  const hex = createHash("sha256")
    .update(`bulk-import:${eventId}:${studentId}:CHECK_IN`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function submitBulkImport(
  access: EventAccess,
  eventId: string,
  input: { identifiers: string[] },
) {
  const event = await managedEvent(eventId, access);
  if (event.deliveryMode !== "ONLINE") {
    throw new ApiError(409, "Bulk attendance import is only available for online events");
  }
  if (new Date() < event.timeEnd) {
    throw new ApiError(
      409,
      "Online attendance can only be imported after the event ends",
      "ONLINE_IMPORT_BEFORE_END",
    );
  }
  if (redisClient.getClient().status !== "ready" || !rabbitClient.isConnected()) {
    throw new ApiError(503, "Attendance processing service is temporarily unavailable");
  }

  if (!input.identifiers.length) throw new ApiError(400, "identifiers must not be empty");
  if (input.identifiers.length > BULK_IMPORT_LIMIT) {
    throw new ApiError(400, `identifiers must contain at most ${BULK_IMPORT_LIMIT} items`);
  }
  const parsed = input.identifiers.map((value) => ({
    value,
    normalized: normalizeIdentifier(value),
  }));
  const invalidIdentifiers = parsed
    .filter((item) => item.normalized === null)
    .map((item) => item.value.trim())
    .filter(Boolean);
  const valid = parsed.flatMap((item) => (item.normalized ? [item.normalized] : []));
  const counts = new Map<string, number>();
  valid.forEach((item) => counts.set(item.key, (counts.get(item.key) ?? 0) + 1));
  const unique = [...new Map(valid.map((item) => [item.key, item])).values()];
  const duplicateIdentifiers = unique
    .filter((item) => (counts.get(item.key) ?? 0) > 1)
    .map((item) => item.email ?? item.studentCode);
  const emails = unique.flatMap((item) => (item.email ? [item.email] : []));
  const studentCodes = unique.flatMap((item) => (item.studentCode ? [item.studentCode] : []));
  const students = await prisma.student.findMany({
    where: {
      user: { status: "ACTIVE" },
      OR: [
        ...(emails.length
          ? [{ user: { email: { in: emails, mode: "insensitive" as const } } }]
          : []),
        ...(studentCodes.length ? [{ studentCode: { in: studentCodes } }] : []),
      ],
    },
    select: { id: true, studentCode: true, user: { select: { email: true } } },
  });
  const studentsByKey = new Map<string, (typeof students)[number]>();
  for (const student of students) {
    studentsByKey.set(`code:${student.studentCode.toUpperCase()}`, student);
    studentsByKey.set(`email:${student.user.email.toLowerCase()}`, student);
  }
  const resolved = unique.flatMap((identifier) => {
    const student = studentsByKey.get(identifier.key);
    return student ? [{ identifier, student }] : [];
  });
  const notFoundIdentifiers = unique
    .filter((identifier) => !studentsByKey.has(identifier.key))
    .map((identifier) => identifier.email ?? identifier.studentCode);
  const existing = resolved.length
    ? await prisma.attendanceRecord.findMany({
        where: {
          eventId,
          direction: "CHECK_IN",
          studentId: { in: resolved.map((item) => item.student.id) },
          status: { in: ["ATTENDED", "LATE"] },
        },
        select: { studentId: true },
      })
    : [];
  const existingStudentIds = new Set(existing.map((item) => item.studentId));
  const occurredAt = new Date().toISOString();
  const rows = resolved
    .filter(({ student }) => !existingStudentIds.has(student.id))
    .map(({ student }) => ({
      requestId: randomUUID(),
      clientAttemptId: bulkImportAttemptId(eventId, student.id),
      correlationId: randomUUID(),
      student,
    }));
  const skippedStudentIds = new Set<string>();
  let queued = 0;

  await prisma.$transaction(async (tx) => {
    for (let offset = 0; offset < rows.length; offset += BULK_IMPORT_BATCH_SIZE) {
      const batch = rows.slice(offset, offset + BULK_IMPORT_BATCH_SIZE);
      const created = await tx.attendanceScanRequest.createManyAndReturn({
        data: batch.map(({ requestId, clientAttemptId, correlationId, student }) => ({
          id: requestId,
          clientAttemptId,
          eventId,
          studentId: student.id,
          submittedByUserId: access.userId,
          direction: "CHECK_IN",
          source: "BULK_IMPORT",
          requestedStatus: "ATTENDED",
          correlationId,
        })),
        skipDuplicates: true,
        select: { id: true, studentId: true, correlationId: true },
      });
      queued += created.length;
      const createdStudentIds = new Set(created.map((item) => item.studentId));
      batch.forEach(({ student }) => {
        if (!createdStudentIds.has(student.id)) skippedStudentIds.add(student.id);
      });
      if (created.length)
        await tx.outboxEvent.createMany({
          data: created.map(({ id: requestId, correlationId, studentId }) =>
            outboxData(requestId, attendanceRoutingKeys.scanRequested, correlationId, {
              schemaVersion: 1,
              requestId,
              eventId,
              sessionId: null,
              studentId,
              direction: "CHECK_IN",
              source: "BULK_IMPORT",
              occurredAt,
              correlationId,
            }),
          ),
        });
    }
  });
  if (queued) {
    attendanceScanRequestsTotal.inc({ source: "BULK_IMPORT", direction: "CHECK_IN" }, queued);
  }
  const alreadyRecordedIdentifiers = resolved
    .filter(
      ({ student }) => existingStudentIds.has(student.id) || skippedStudentIds.has(student.id),
    )
    .map(({ identifier }) => identifier.email ?? identifier.studentCode);
  return {
    requested: input.identifiers.length,
    queued,
    duplicateIdentifiers,
    invalidIdentifiers,
    notFoundIdentifiers,
    alreadyRecordedIdentifiers,
  };
}
