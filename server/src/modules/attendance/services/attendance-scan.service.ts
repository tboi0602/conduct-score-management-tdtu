import { randomUUID } from "crypto";
import {
  AttendanceDirection,
  AttendanceScanSource,
  AttendanceScanStatus,
  AttendanceStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "@config/prisma";
import { attendanceRateLimitRejectionsTotal, attendanceScanRequestsTotal } from "@metrics";
import { rabbitClient } from "@rabbitmq";
import { attendanceRoutingKeys } from "@producers/attendance.producer";
import { redisClient } from "@redis";
import { eventScope, type EventAccess } from "@services/events/event-access.service";
import { invalidateDashboardCache } from "@modules/dashboard";
import { createAttendanceQrToken, verifyAttendanceQrToken } from "@utils/attendanceQr";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";
import { syncEventConductScore } from "@modules/conduct-score";
import { env } from "@config/env";
export { getMyRequest, listRequests } from "@modules/attendance/queries/attendance-request.queries";
export { submitBulkImport } from "@modules/attendance/services/attendance-bulk-import.service";
import {
  activeSessionKey,
  managedEvent,
  outboxData,
  validateCoordinates,
  type Coordinates,
} from "@modules/attendance/services/attendance-session.service";
export {
  closeSession,
  getActiveSession,
  getQr,
  openSession,
} from "@modules/attendance/services/attendance-session.service";

async function createScanRequest(input: {
  eventId: string;
  sessionId?: string;
  studentId: string;
  submittedByUserId: string;
  direction: AttendanceDirection;
  source: AttendanceScanSource;
  requestedStatus: AttendanceStatus;
  clientAttemptId?: string;
  coordinates?: Coordinates;
}) {
  if (input.clientAttemptId) {
    const existing = await prisma.attendanceScanRequest.findFirst({
      where: {
        clientAttemptId: input.clientAttemptId,
        studentId: input.studentId,
        submittedByUserId: input.submittedByUserId,
      },
      select: { id: true, correlationId: true, status: true },
    });
    if (existing) {
      return {
        requestId: existing.id,
        correlationId: existing.correlationId,
        status: existing.status,
      };
    }
  }
  if (redisClient.getClient().status !== "ready" || !rabbitClient.isConnected()) {
    throw new ApiError(503, "Attendance processing service is temporarily unavailable");
  }
  const windowSeconds = env.attendanceRateLimitWindow;
  const maximum =
    input.source === "STUDENT_QR"
      ? env.attendanceStudentRateLimitMax
      : env.attendanceManagerRateLimitMax;
  const bucket = input.sessionId ?? input.eventId;
  const [actorLimit, sessionLimit] = await Promise.all([
    redisClient.rateLimit(`attendance:actor:${input.submittedByUserId}`, maximum, windowSeconds),
    redisClient.rateLimit(
      `attendance:bucket:${bucket}`,
      Math.max(maximum * 100, 1_000),
      windowSeconds,
    ),
  ]);
  if (!actorLimit.allowed || !sessionLimit.allowed) {
    attendanceRateLimitRejectionsTotal.inc();
    throw new ApiError(429, "Too many attendance requests; please try again shortly");
  }
  const requestId = randomUUID();
  const correlationId = randomUUID();
  const occurredAt = new Date().toISOString();
  try {
    await prisma.$transaction(async (tx) => {
      await tx.attendanceScanRequest.create({
        data: {
          id: requestId,
          clientAttemptId: input.clientAttemptId,
          eventId: input.eventId,
          sessionId: input.sessionId,
          studentId: input.studentId,
          submittedByUserId: input.submittedByUserId,
          direction: input.direction,
          source: input.source,
          requestedStatus: input.requestedStatus,
          latitude: input.coordinates?.latitude,
          longitude: input.coordinates?.longitude,
          accuracyMeters: input.coordinates?.accuracyMeters,
          correlationId,
        },
      });
      await tx.outboxEvent.create({
        data: outboxData(requestId, attendanceRoutingKeys.scanRequested, correlationId, {
          schemaVersion: 1,
          requestId,
          eventId: input.eventId,
          sessionId: input.sessionId ?? null,
          studentId: input.studentId,
          direction: input.direction,
          source: input.source,
          occurredAt,
          correlationId,
        }),
      });
    });
  } catch (error) {
    if (
      input.clientAttemptId &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.attendanceScanRequest.findFirst({
        where: { clientAttemptId: input.clientAttemptId, studentId: input.studentId },
        select: { id: true, correlationId: true, status: true },
      });
      if (existing) {
        return {
          requestId: existing.id,
          correlationId: existing.correlationId,
          status: existing.status,
        };
      }
    }
    throw error;
  }
  attendanceScanRequestsTotal.inc({ source: input.source, direction: input.direction });
  return { requestId, correlationId, status: AttendanceScanStatus.PENDING };
}

export async function submitStudentQr(
  userId: string,
  token: string,
  coordinates: Coordinates,
  clientAttemptId?: string,
) {
  const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) throw new ApiError(409, "Student profile is required");
  if (clientAttemptId) {
    const existing = await prisma.attendanceScanRequest.findFirst({
      where: { clientAttemptId, studentId: student.id, submittedByUserId: userId },
      select: {
        id: true,
        correlationId: true,
        status: true,
        direction: true,
        event: { select: { id: true, name: true, timeEnd: true } },
      },
    });
    if (existing) {
      return {
        requestId: existing.id,
        correlationId: existing.correlationId,
        status: existing.status,
        direction: existing.direction,
        event: existing.event,
      };
    }
  }
  validateCoordinates(coordinates);
  if (coordinates.accuracyMeters > 100)
    throw new ApiError(409, "Location accuracy is too low", "LOCATION_ACCURACY_LOW");
  const sessionId = verifyAttendanceQrToken(token);
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    include: { event: { select: { id: true, name: true, timeEnd: true } } },
  });
  if (!session || session.status !== "OPEN")
    throw new ApiError(409, "Attendance session is closed");
  const activeId = await redisClient.getClient().get(activeSessionKey(session.eventId));
  if (activeId !== session.id) throw new ApiError(409, "Attendance session is closed");
  const result = await createScanRequest({
    eventId: session.eventId,
    sessionId,
    studentId: student.id,
    submittedByUserId: userId,
    direction: session.direction,
    source: "STUDENT_QR",
    requestedStatus: "ATTENDED",
    clientAttemptId,
    coordinates,
  });
  return { ...result, direction: session.direction, event: session.event };
}

export async function getMyAttempt(userId: string, clientAttemptId: string) {
  const request = await prisma.attendanceScanRequest.findFirst({
    where: { clientAttemptId, student: { userId } },
    select: {
      id: true,
      status: true,
      rejectionReason: true,
      processedAt: true,
      direction: true,
      event: { select: { id: true, name: true, timeEnd: true } },
    },
  });
  return request ? { found: true as const, request } : { found: false as const, request: null };
}

export async function submitManagedScan(
  access: EventAccess,
  eventId: string,
  input: {
    studentCode: string;
    direction: AttendanceDirection;
    source: "STAFF_BARCODE" | "MANUAL_ENTRY";
    status: "ATTENDED" | "LATE";
  },
) {
  const event = await managedEvent(eventId, access);
  if (event.checkInMode === "ONE_WAY" && input.direction === "CHECK_OUT")
    throw new ApiError(409, "One-way events do not support check-out");
  const studentId =
    input.source === "MANUAL_ENTRY"
      ? (
          await prisma.student.findUnique({
            where: { studentCode: input.studentCode },
            select: { id: true },
          })
        )?.id
      : (
          await prisma.eventRegistration.findFirst({
            where: { eventId, status: "REGISTERED", student: { studentCode: input.studentCode } },
            select: { studentId: true },
          })
        )?.studentId;
  if (!studentId) {
    throw new ApiError(
      409,
      input.source === "MANUAL_ENTRY"
        ? "Student does not exist"
        : "Student is not actively registered for this event",
    );
  }
  return createScanRequest({
    eventId,
    studentId,
    submittedByUserId: access.userId,
    direction: input.direction,
    source: input.source,
    requestedStatus: input.status,
  });
}

export async function adjustAttendanceStatus(
  access: EventAccess,
  eventId: string,
  recordId: string,
  status: AttendanceStatus,
) {
  const event = await managedEvent(eventId, access);
  const current = await prisma.attendanceRecord.findFirst({
    where: { id: recordId, eventId },
    select: { id: true, studentId: true, direction: true, pointsEarned: true },
  });
  if (!current) throw new ApiError(404, "Attendance record not found");
  const now = new Date();
  const correlationId = randomUUID();
  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.update({
      where: { id: current.id },
      data: {
        status,
        pointsEarned:
          status === "ABSENT"
            ? 0
            : event.checkInMode === "ONE_WAY"
              ? (
                  await tx.event.findUniqueOrThrow({
                    where: { id: eventId },
                    select: { points: true },
                  })
                ).points
              : current.pointsEarned,
      },
    });
    const audit = await tx.attendanceScanRequest.create({
      data: {
        eventId,
        studentId: current.studentId,
        submittedByUserId: access.userId,
        direction: current.direction,
        source: "MANUAL_ENTRY",
        requestedStatus: status,
        status: "ACCEPTED",
        correlationId,
        processedAt: now,
      },
    });
    await tx.outboxEvent.create({
      data: outboxData(audit.id, attendanceRoutingKeys.scanProcessed, correlationId, {
        schemaVersion: 1,
        requestId: audit.id,
        eventId,
        studentId: current.studentId,
        direction: current.direction,
        source: "MANUAL_ENTRY",
        status: "ACCEPTED",
        requestedStatus: status,
        occurredAt: now.toISOString(),
        correlationId,
      }),
    });
    return record;
  });
  const organizer = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizer: { select: { facultyId: true } } },
  });
  await syncEventConductScore(current.studentId, eventId);
  await invalidateDashboardCache(organizer?.organizer?.facultyId);
  return updated;
}
