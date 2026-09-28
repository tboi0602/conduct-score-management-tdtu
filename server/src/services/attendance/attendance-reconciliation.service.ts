import { Prisma } from "@prisma/client";
import { prisma } from "@config/prisma";
import type { EventAccess } from "@services/events/event-access.service";
import { eventScope } from "@services/events/event-access.service";
import { ApiError } from "@utils/ApiError";
import { sha256Hex } from "@utils/canonicalJson";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";

export type IncidentPayload = {
  clientAttemptId: string;
  eventId: string;
  direction: "CHECK_IN" | "CHECK_OUT" | null;
  failureCategory:
    | "NETWORK_ERROR"
    | "QR_ERROR"
    | "SESSION_EXPIRED"
    | "TIMEOUT"
    | "LOCATION_ERROR"
    | "SERVICE_ERROR"
    | "OTHER";
  failedAt: string;
  latitude: number | null;
  longitude: number | null;
  accuracyMeters: number | null;
  tokenFingerprint: string | null;
  clientOnline: boolean;
  userAgent: string | null;
};

async function assertManagedEvent(eventId: string, access: EventAccess) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, ...eventScope(access) },
    select: { id: true },
  });
  if (!event) throw new ApiError(404, "Event not found or outside your scope");
}

export async function submitIncident(userId: string, payload: IncidentPayload, digest: string) {
  if (sha256Hex(payload) !== digest.toLowerCase())
    throw new ApiError(400, "Incident digest is invalid");
  const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) throw new ApiError(409, "Student profile is required");
  const event = await prisma.event.findUnique({
    where: { id: payload.eventId },
    select: { id: true },
  });
  if (!event) throw new ApiError(404, "Event not found");
  return prisma.attendanceClientIncident.upsert({
    where: { clientAttemptId: payload.clientAttemptId },
    update: {},
    create: {
      clientAttemptId: payload.clientAttemptId,
      studentId: student.id,
      eventId: payload.eventId,
      direction: payload.direction,
      failureCategory: payload.failureCategory,
      failedAt: new Date(payload.failedAt),
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracyMeters: payload.accuracyMeters,
      tokenFingerprint: payload.tokenFingerprint,
      clientOnline: payload.clientOnline,
      userAgent: payload.userAgent,
      payload: payload as unknown as Prisma.InputJsonObject,
      digest: digest.toLowerCase(),
    },
    select: { id: true, clientAttemptId: true, status: true, createdAt: true },
  });
}

type ReconciliationRow = {
  incidentId: string | null;
  auditId: string | null;
  clientAttemptId: string;
  studentCode: string | null;
  studentName: string | null;
  failureCategory: string | null;
  failedAt: Date | null;
  digest: string | null;
  incidentStatus: string | null;
  resolutionNote: string | null;
  requestId: string | null;
  httpStatus: number | null;
  durationMs: number | null;
  instance: string | null;
  scanStatus: string | null;
  rejectionReason: string | null;
  attendanceStatus: string | null;
  total: bigint;
};

export async function listReconciliation(
  access: EventAccess,
  eventId: string,
  params: PaginationParams,
  search = "",
  state?: "MATCHED" | "CLIENT_ONLY" | "SERVER_ONLY" | "RESOLVED",
) {
  await assertManagedEvent(eventId, access);
  const searchPattern = `%${search}%`;
  const stateFilter = state ?? null;
  const rows = await prisma.$queryRaw<ReconciliationRow[]>(Prisma.sql`
    WITH combined AS (
      SELECT i."id" AS "incidentId", a."id" AS "auditId",
        COALESCE(i."clientAttemptId", a."clientAttemptId") AS "clientAttemptId",
        COALESCE(i."studentId", a."studentId", sr."studentId") AS "studentId",
        i."failureCategory", i."failedAt", i."digest", i."status" AS "incidentStatus",
        i."resolutionNote", a."requestId", a."statusCode" AS "httpStatus",
        a."durationMs", a."instance", sr."status" AS "scanStatus",
        sr."rejectionReason", ar."status" AS "attendanceStatus"
      FROM "attendance_client_incidents" i
      FULL OUTER JOIN "attendance_access_audits" a ON a."clientAttemptId" = i."clientAttemptId"
      LEFT JOIN "attendance_scan_requests" sr ON sr."clientAttemptId" = COALESCE(i."clientAttemptId", a."clientAttemptId")
      LEFT JOIN "attendance_records" ar ON ar."scanRequestId" = sr."id"
      WHERE COALESCE(i."eventId", a."eventId", sr."eventId") = ${eventId}::uuid
    ), filtered AS (
      SELECT c.*, s."studentCode", u."name" AS "studentName",
        CASE
          WHEN c."incidentStatus" = 'RESOLVED'::"AttendanceIncidentStatus" THEN 'RESOLVED'
          WHEN c."incidentId" IS NOT NULL AND (c."auditId" IS NOT NULL OR c."scanStatus" IS NOT NULL) THEN 'MATCHED'
          WHEN c."incidentId" IS NOT NULL THEN 'CLIENT_ONLY'
          ELSE 'SERVER_ONLY'
        END AS "reconciliationState"
      FROM combined c
      LEFT JOIN "students" s ON s."id" = c."studentId"
      LEFT JOIN "users" u ON u."id" = s."userId"
    )
    SELECT *, COUNT(*) OVER() AS "total"
    FROM filtered
    WHERE (${search} = '' OR "studentCode" ILIKE ${searchPattern} OR "studentName" ILIKE ${searchPattern}
      OR "clientAttemptId"::text ILIKE ${searchPattern})
      AND (${stateFilter}::text IS NULL OR "reconciliationState" = ${stateFilter})
    ORDER BY COALESCE("failedAt", CURRENT_TIMESTAMP) DESC, "clientAttemptId" DESC
    LIMIT ${params.limit} OFFSET ${params.skip}
  `);
  const total = Number(rows[0]?.total ?? 0);
  return {
    items: rows.map(({ total: _total, ...row }) => row),
    pagination: createPaginationMeta(total, params),
  };
}

export async function resolveIncident(
  access: EventAccess,
  eventId: string,
  incidentId: string,
  note: string,
) {
  await assertManagedEvent(eventId, access);
  const updated = await prisma.attendanceClientIncident.updateMany({
    where: { id: incidentId, eventId },
    data: {
      status: "RESOLVED",
      resolutionNote: note,
      resolvedAt: new Date(),
      resolvedByUserId: access.userId,
    },
  });
  if (!updated.count) throw new ApiError(404, "Incident not found");
  return prisma.attendanceClientIncident.findUnique({
    where: { id: incidentId },
    select: { id: true, status: true, resolutionNote: true, resolvedAt: true },
  });
}

export async function recordAccessAudit(payload: {
  requestId: string;
  clientAttemptId: string | null;
  userId: string | null;
  eventId: string | null;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  instance: string;
  createdAt: string;
}) {
  const student = payload.userId
    ? await prisma.student.findUnique({ where: { userId: payload.userId }, select: { id: true } })
    : null;
  await prisma.attendanceAccessAudit.upsert({
    where: { requestId: payload.requestId },
    update: {},
    create: { ...payload, studentId: student?.id, createdAt: new Date(payload.createdAt) },
  });
}
