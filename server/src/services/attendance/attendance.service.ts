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
import { invalidateDashboardCache } from "@services/dashboard/dashboard.service";
import { createAttendanceQrToken, verifyAttendanceQrToken } from "@utils/attendanceQr";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";
import { syncEventConductScore } from "@services/conduct-score/conduct-score.service";

const ACTIVE_SESSION_TTL_SECONDS = 24 * 60 * 60;
const ORGANIZER_MAX_ACCURACY_METERS = Number(
  process.env.ATTENDANCE_ORGANIZER_MAX_GPS_ERROR_METERS ?? 500,
);
const activeSessionKey = (eventId: string) => `attendance:active-session:${eventId}`;
export type Coordinates = { latitude: number; longitude: number; accuracyMeters: number };

function validateCoordinates(input: Coordinates): void {
  if (
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180 ||
    !Number.isFinite(input.accuracyMeters) ||
    input.accuracyMeters <= 0
  )
    throw new ApiError(400, "Invalid device coordinates");
}

async function managedEvent(eventId: string, access: EventAccess) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, ...eventScope(access) },
    select: {
      id: true,
      name: true,
      checkInMode: true,
      deliveryMode: true,
      attendanceRadiusMeters: true,
      timeStart: true,
      timeEnd: true,
    },
  });
  if (!event) throw new ApiError(404, "Event not found");
  return event;
}

function outboxData(
  aggregateId: string,
  eventType: string,
  correlationId: string,
  payload: Prisma.InputJsonObject,
) {
  return { aggregateType: "attendance", aggregateId, eventType, correlationId, payload };
}

export async function openSession(
  access: EventAccess,
  eventId: string,
  direction: AttendanceDirection,
  coordinates: Coordinates,
) {
  if (redisClient.getClient().status !== "ready" || !rabbitClient.isConnected()) {
    throw new ApiError(503, "Attendance processing service is temporarily unavailable");
  }
  validateCoordinates(coordinates);
  if (coordinates.accuracyMeters > ORGANIZER_MAX_ACCURACY_METERS) {
    throw new ApiError(
      409,
      `Organizer location accuracy must be ${ORGANIZER_MAX_ACCURACY_METERS} meters or better`,
    );
  }
  const event = await managedEvent(eventId, access);
  if (event.checkInMode === "ONE_WAY" && direction === "CHECK_OUT")
    throw new ApiError(409, "One-way events do not support check-out");
  const correlationId = randomUUID();
  const now = new Date();
  const session = await prisma.$transaction(async (tx) => {
    await tx.attendanceSession.updateMany({
      where: { eventId, status: "OPEN" },
      data: { status: "CLOSED", closedAt: now, closedByUserId: access.userId },
    });
    const created = await tx.attendanceSession.create({
      data: {
        eventId,
        direction,
        centerLatitude: coordinates.latitude,
        centerLongitude: coordinates.longitude,
        centerAccuracyMeters: coordinates.accuracyMeters,
        radiusMeters: event.attendanceRadiusMeters,
        openedByUserId: access.userId,
      },
    });
    await tx.outboxEvent.create({
      data: outboxData(created.id, attendanceRoutingKeys.sessionOpened, correlationId, {
        schemaVersion: 1,
        eventId,
        sessionId: created.id,
        direction,
        occurredAt: now.toISOString(),
        correlationId,
      }),
    });
    return created;
  });
  try {
    await redisClient
      .getClient()
      .set(activeSessionKey(eventId), session.id, "EX", ACTIVE_SESSION_TTL_SECONDS);
  } catch {
    await prisma.attendanceSession.update({
      where: { id: session.id },
      data: { status: "CLOSED", closedAt: new Date(), closedByUserId: access.userId },
    });
    throw new ApiError(503, "Attendance realtime service is unavailable");
  }
  return session;
}

export async function closeSession(access: EventAccess, eventId: string) {
  await managedEvent(eventId, access);
  const current = await prisma.attendanceSession.findFirst({
    where: { eventId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
  });
  if (!current) throw new ApiError(409, "No active attendance session");
  const correlationId = randomUUID();
  const closedAt = new Date();
  const closed = await prisma.$transaction(async (tx) => {
    const updated = await tx.attendanceSession.update({
      where: { id: current.id },
      data: { status: "CLOSED", closedAt, closedByUserId: access.userId },
    });
    await tx.outboxEvent.create({
      data: outboxData(updated.id, attendanceRoutingKeys.sessionClosed, correlationId, {
        schemaVersion: 1,
        eventId,
        sessionId: updated.id,
        direction: updated.direction,
        occurredAt: closedAt.toISOString(),
        correlationId,
      }),
    });
    return updated;
  });
  await redisClient
    .getClient()
    .del(activeSessionKey(eventId))
    .catch(() => undefined);
  return closed;
}

export async function getActiveSession(access: EventAccess, eventId: string) {
  await managedEvent(eventId, access);
  return prisma.attendanceSession.findFirst({
    where: { eventId, status: "OPEN" },
    orderBy: { openedAt: "desc" },
    include: { event: { select: { name: true, timeEnd: true } } },
  });
}

export async function getQr(access: EventAccess, eventId: string) {
  const session = await getActiveSession(access, eventId);
  if (!session) throw new ApiError(409, "No active attendance session");
  const activeId = await redisClient.getClient().get(activeSessionKey(eventId));
  if (activeId !== session.id) throw new ApiError(503, "Attendance session cache is unavailable");
  const qr = createAttendanceQrToken(session.id);
  const origin = process.env.CLIENT_ORIGIN ?? "http://localhost:3001";
  const query = new URLSearchParams({
    token: qr.token,
    eventId: session.eventId,
    direction: session.direction,
    eventName: session.event.name,
    eventEnd: session.event.timeEnd.toISOString(),
  });
  return {
    ...qr,
    scanUrl: `${origin}/events/check-in?${query.toString()}`,
    session,
  };
}

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
  const windowSeconds = Number(process.env.ATTENDANCE_RATE_LIMIT_WINDOW ?? 10);
  const maximum =
    input.source === "STUDENT_QR"
      ? Number(process.env.ATTENDANCE_STUDENT_RATE_LIMIT_MAX ?? 6)
      : Number(process.env.ATTENDANCE_MANAGER_RATE_LIMIT_MAX ?? 60);
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
  if (coordinates.accuracyMeters > 100) throw new ApiError(409, "Location accuracy is too low");
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

export async function getMyRequest(userId: string, requestId: string) {
  const item = await prisma.attendanceScanRequest.findFirst({
    where: { id: requestId, student: { userId } },
    select: {
      id: true,
      status: true,
      rejectionReason: true,
      processedAt: true,
      eventId: true,
      direction: true,
    },
  });
  if (!item) throw new ApiError(404, "Attendance request not found");
  return item;
}

export async function listRequests(
  access: EventAccess,
  eventId: string,
  params: PaginationParams,
  search?: string,
  status?: AttendanceScanStatus,
) {
  await managedEvent(eventId, access);
  const where: Prisma.AttendanceScanRequestWhereInput = {
    eventId,
    status,
    OR: search
      ? [
          { student: { studentCode: { contains: search, mode: "insensitive" } } },
          { student: { user: { name: { contains: search, mode: "insensitive" } } } },
          { student: { user: { email: { contains: search, mode: "insensitive" } } } },
        ]
      : undefined,
  };
  const [total, items] = await prisma.$transaction([
    prisma.attendanceScanRequest.count({ where }),
    prisma.attendanceScanRequest.findMany({
      where,
      select: {
        id: true,
        direction: true,
        source: true,
        requestedStatus: true,
        status: true,
        rejectionReason: true,
        processedAt: true,
        createdAt: true,
        attendanceRecord: { select: { id: true, status: true } },
        student: {
          select: { id: true, studentCode: true, user: { select: { name: true, email: true } } },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return { items, pagination: createPaginationMeta(total, params) };
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
