import { Prisma, type AttendanceScanStatus } from "@prisma/client";

import { prisma } from "@config/prisma";
import { managedEvent } from "@modules/attendance/services/attendance-session.service";
import type { EventAccess } from "@services/events/event-access.service";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";
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
  const requestWhere: Prisma.AttendanceScanRequestWhereInput = {
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
  const [allRegistrations, requests] = await prisma.$transaction([
    prisma.eventRegistration.findMany({
      where: {
        eventId,
        status: "REGISTERED",
        student: search
          ? {
              OR: [
                { studentCode: { contains: search, mode: "insensitive" } },
                { user: { name: { contains: search, mode: "insensitive" } } },
                { user: { email: { contains: search, mode: "insensitive" } } },
              ],
            }
          : undefined,
      },
      select: {
        id: true,
        registeredAt: true,
        student: {
          select: {
            id: true,
            studentCode: true,
            user: { select: { name: true, email: true } },
            attendanceRecords: {
              where: { eventId, direction: "CHECK_IN" },
              select: { id: true, status: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ registeredAt: "desc" }, { id: "desc" }],
    }),
    prisma.attendanceScanRequest.findMany({
      where: requestWhere,
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
    }),
  ]);

  const requestStudentIds = new Set(requests.map((item) => item.student.id));
  const registrationRows = (status ? [] : allRegistrations)
    .filter((registration) => !requestStudentIds.has(registration.student.id))
    .map((registration) => ({
      id: `registration:${registration.id}`,
      direction: "CHECK_IN" as const,
      source: "REGISTERED" as const,
      requestedStatus: "ATTENDED" as const,
      status: "PENDING" as const,
      rejectionReason: null,
      processedAt: null,
      createdAt: registration.registeredAt,
      student: registration.student,
      attendanceRecord: registration.student.attendanceRecords[0] ?? null,
      isRegistrationOnly: true,
    }));
  const items = [...requests, ...registrationRows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const total = items.length;
  return {
    items: items.slice(params.skip, params.skip + params.limit),
    pagination: createPaginationMeta(total, params),
  };
}
