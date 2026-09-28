import type { AttendanceScanRequest, AttendanceScanSource } from "@prisma/client";
import { prisma } from "@config/prisma";
import { logger } from "@config/logger";
import {
  attendanceGeofenceRejections,
  attendanceIdempotencyHits,
  attendanceProcessingDuration,
  attendanceWorkerInflight,
} from "@metrics";
import { attendanceRoutingKeys } from "@producers/attendance.producer";
import { redisClient } from "@redis";
import { sseHub } from "@realtime/sse";
import { invalidateDashboardCache } from "@services/dashboard/dashboard.service";
import { syncEventConductScore } from "@services/conduct-score/conduct-score.service";
import { recordAccessAudit } from "@services/attendance/attendance-reconciliation.service";

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(bLat - aLat);
  const dLng = radians(bLng - aLng);
  const value =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

type LoadedRequest = AttendanceScanRequest & {
  event: {
    checkInMode: "ONE_WAY" | "TWO_WAY";
    points: number;
    organizer: { facultyId: string | null } | null;
  };
  session: {
    status: "OPEN" | "CLOSED";
    direction: "CHECK_IN" | "CHECK_OUT";
    centerLatitude: number;
    centerLongitude: number;
    centerAccuracyMeters: number;
    radiusMeters: number;
  } | null;
  student: { userId: string };
};

function rejection(request: LoadedRequest, registered: boolean): string | null {
  if (!registered && request.source !== "MANUAL_ENTRY" && request.source !== "BULK_IMPORT")
    return "NOT_REGISTERED";
  if (request.event.checkInMode === "ONE_WAY" && request.direction === "CHECK_OUT")
    return "DIRECTION_NOT_ALLOWED";
  if (request.source !== "STUDENT_QR") return null;
  if (
    !request.session ||
    request.session.status !== "OPEN" ||
    request.session.direction !== request.direction
  )
    return "SESSION_CLOSED";
  if (request.latitude === null || request.longitude === null || request.accuracyMeters === null)
    return "LOCATION_REQUIRED";
  if (request.accuracyMeters > 100) return "LOCATION_INACCURATE";
  const distance = distanceMeters(
    request.session.centerLatitude,
    request.session.centerLongitude,
    request.latitude,
    request.longitude,
  );
  return distance >
    request.session.radiusMeters + request.accuracyMeters + request.session.centerAccuracyMeters
    ? "OUTSIDE_GEOFENCE"
    : null;
}

async function processLocked(requestId: string): Promise<void> {
  const request = await prisma.attendanceScanRequest.findUnique({
    where: { id: requestId },
    include: {
      event: {
        select: { checkInMode: true, points: true, organizer: { select: { facultyId: true } } },
      },
      session: {
        select: {
          status: true,
          direction: true,
          centerLatitude: true,
          centerLongitude: true,
          centerAccuracyMeters: true,
          radiusMeters: true,
        },
      },
      student: { select: { userId: true } },
    },
  });
  if (!request || request.status !== "PENDING") {
    attendanceIdempotencyHits.inc();
    return;
  }
  const registration = await prisma.eventRegistration.findUnique({
    where: { eventId_studentId: { eventId: request.eventId, studentId: request.studentId } },
    select: { status: true },
  });
  const reason = rejection(request, registration?.status === "REGISTERED");
  if (reason?.startsWith("LOCATION") || reason === "OUTSIDE_GEOFENCE")
    attendanceGeofenceRejections.inc({ reason });
  const processedAt = new Date();
  const finalStatus = reason ? "REJECTED" : "ACCEPTED";
  await prisma.$transaction(async (tx) => {
    if (!reason) {
      await tx.attendanceRecord.createMany({
        data: {
          studentId: request.studentId,
          eventId: request.eventId,
          direction: request.direction,
          timeChecking: processedAt,
          status: request.requestedStatus,
          pointsEarned: request.event.checkInMode === "ONE_WAY" ? request.event.points : 0,
          scanRequestId: request.id,
        },
        skipDuplicates: true,
      });
    }
    await tx.attendanceScanRequest.update({
      where: { id: request.id },
      data: {
        status: finalStatus,
        rejectionReason: reason,
        processedAt,
      },
    });
    await tx.outboxEvent.create({
      data: {
        aggregateType: "attendance",
        aggregateId: request.id,
        eventType: attendanceRoutingKeys.scanProcessed,
        correlationId: request.correlationId,
        payload: {
          schemaVersion: 1,
          requestId: request.id,
          eventId: request.eventId,
          studentId: request.studentId,
          direction: request.direction,
          source: request.source,
          status: finalStatus,
          rejectionReason: reason,
          occurredAt: processedAt.toISOString(),
          correlationId: request.correlationId,
        },
      },
    });
  });
  if (!reason) await syncEventConductScore(request.studentId, request.eventId);
  const payload = {
    type: "attendance.scan.processed",
    requestId: request.id,
    eventId: request.eventId,
    direction: request.direction,
    source: request.source,
    status: finalStatus,
    rejectionReason: reason,
    processedAt: processedAt.toISOString(),
  };
  await Promise.all([
    sseHub.publish(`sse:student:${request.student.userId}`, payload),
    sseHub.publish(`sse:event:${request.eventId}`, payload),
    sseHub.publish("sse:dashboard:global", { type: "dashboard.invalidated" }),
    ...(request.event.organizer?.facultyId
      ? [
          sseHub.publish(`sse:dashboard:faculty:${request.event.organizer.facultyId}`, {
            type: "dashboard.invalidated",
          }),
        ]
      : []),
    invalidateDashboardCache(request.event.organizer?.facultyId),
  ]);
  logger.info("attendance scan processed", {
    requestId: request.id,
    correlationId: request.correlationId,
    eventId: request.eventId,
    studentId: request.studentId,
    source: request.source,
    direction: request.direction,
    result: finalStatus,
    rejectionReason: reason,
  });
}

export async function handleAttendanceMessage(payload: Record<string, unknown>): Promise<void> {
  if (
    payload.schemaVersion === 1 &&
    typeof payload.requestId === "string" &&
    typeof payload.path === "string" &&
    typeof payload.statusCode === "number"
  ) {
    await recordAccessAudit({
      requestId: payload.requestId,
      clientAttemptId: typeof payload.clientAttemptId === "string" ? payload.clientAttemptId : null,
      userId: typeof payload.userId === "string" ? payload.userId : null,
      eventId: typeof payload.eventId === "string" ? payload.eventId : null,
      method: typeof payload.method === "string" ? payload.method : "POST",
      path: payload.path,
      statusCode: payload.statusCode,
      durationMs: typeof payload.durationMs === "number" ? payload.durationMs : 0,
      instance: typeof payload.instance === "string" ? payload.instance : "unknown",
      createdAt:
        typeof payload.createdAt === "string" ? payload.createdAt : new Date().toISOString(),
    });
    return;
  }
  const requestId = payload.requestId;
  if (typeof requestId !== "string") {
    const error = new Error("Attendance message is missing requestId") as Error & {
      noRetry?: boolean;
    };
    error.noRetry = true;
    throw error;
  }
  const started = process.hrtime.bigint();
  attendanceWorkerInflight.inc();
  let source: AttendanceScanSource = "MANUAL_ENTRY";
  let direction = "CHECK_IN";
  let result = "error";
  try {
    if (
      payload.source === "STUDENT_QR" ||
      payload.source === "STAFF_BARCODE" ||
      payload.source === "MANUAL_ENTRY" ||
      payload.source === "BULK_IMPORT"
    )
      source = payload.source;
    if (payload.direction === "CHECK_OUT") direction = "CHECK_OUT";
    const processed = await redisClient.withLock(`attendance-request:${requestId}`, 30_000, () =>
      processLocked(requestId),
    );
    if (processed === null) throw new Error("Attendance request is already being processed");
    result = "processed";
  } finally {
    attendanceWorkerInflight.dec();
    attendanceProcessingDuration.observe(
      { result, source, direction },
      Number(process.hrtime.bigint() - started) / 1_000_000_000,
    );
  }
}
