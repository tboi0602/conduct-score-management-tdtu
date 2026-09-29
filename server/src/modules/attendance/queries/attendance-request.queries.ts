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
