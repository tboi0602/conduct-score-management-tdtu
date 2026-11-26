import type { Prisma } from "@prisma/client";

import { prisma } from "@config/prisma";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";
import {
  decorateEvent,
  publicEventSelect,
  type PublicEventFilters,
} from "./student-event-discovery.service";
function vietnamParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = get("weekday");
  const dayMap: Record<string, number> = { Mon: 2, Tue: 3, Wed: 4, Thu: 5, Fri: 6, Sat: 7, Sun: 8 };
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    dayOfWeek: dayMap[weekday],
    minute: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

const sessionMinute = (value: Date) => value.getUTCHours() * 60 + value.getUTCMinutes();

export async function listRecommendedEvents(
  userId: string,
  params: PaginationParams,
  filters: PublicEventFilters,
) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: {
      id: true,
      schedules: {
        select: {
          semesterId: true,
          dayOfWeek: true,
          classSessionId: true,
          classSession: { select: { startTime: true, endTime: true } },
        },
      },
      scheduleExceptions: {
        select: {
          semesterId: true,
          date: true,
          classSessionId: true,
          status: true,
          classSession: { select: { startTime: true, endTime: true } },
        },
      },
    },
  });
  if (!student) throw new ApiError(409, "Student profile is required");
  const now = new Date();
  const statusCondition: Prisma.EventWhereInput =
    filters.status === "UPCOMING"
      ? { timeStart: { gt: now } }
      : filters.status === "ONGOING"
        ? { timeStart: { lte: now }, timeEnd: { gte: now } }
        : filters.status === "COMPLETED"
          ? { timeEnd: { lt: now } }
          : {};
  const where: Prisma.EventWhereInput = {
    AND: [
      {
        OR: [
          { deliveryMode: "OFFLINE", timeStart: { gt: now }, registrationEnd: { gte: now } },
          { deliveryMode: "ONLINE", timeEnd: { gt: now } },
        ],
      },
      statusCondition,
      {
        OR: [
          {
            deliveryMode: "OFFLINE",
            registrations: { none: { studentId: student.id, status: "REGISTERED" } },
          },
          {
            deliveryMode: "ONLINE",
            attendanceRecords: {
              none: {
                studentId: student.id,
                direction: "CHECK_IN",
                status: { in: ["ATTENDED", "LATE"] },
              },
            },
          },
        ],
      },
    ],
    name: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
    criteriaId: filters.criteriaId,
    organizerId: filters.organizerId,
    type: filters.type,
    deliveryMode: filters.deliveryMode,
    checkInMode: filters.checkInMode,
    timeStart: { gte: filters.startsFrom, lte: filters.startsTo },
  };
  // Prisma cannot compare two columns in a portable filter. Fetch eligible candidates, then apply
  // capacity and offline recurring/exception schedule rules before slicing the requested page.
  const candidates = await prisma.event.findMany({
    where,
    select: {
      ...publicEventSelect,
      registrations: {
        where: { studentId: student.id },
        select: { status: true, registeredAt: true, cancelledAt: true },
        take: 1,
      },
      attendanceRecords: {
        where: {
          studentId: student.id,
          direction: "CHECK_IN",
          status: { in: ["ATTENDED", "LATE"] },
        },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: [{ timeStart: "asc" }, { id: "asc" }],
  });
  const available = candidates.filter((event) => {
    if (event.deliveryMode === "ONLINE") return true;
    if (event.capacity !== null && event.registeredCount >= event.capacity) return false;
    const start = vietnamParts(event.timeStart);
    const end = vietnamParts(event.timeEnd);
    const occupied = new Map<string, { startTime: Date; endTime: Date }>();
    for (const slot of student.schedules) {
      if (slot.semesterId === event.semesterId && slot.dayOfWeek === start.dayOfWeek)
        occupied.set(slot.classSessionId, slot.classSession);
    }
    for (const item of student.scheduleExceptions) {
      const itemDate = item.date.toISOString().slice(0, 10);
      if (item.semesterId !== event.semesterId || itemDate !== start.date) continue;
      if (item.status === "HAS_CLASS") occupied.set(item.classSessionId, item.classSession);
      else occupied.delete(item.classSessionId);
    }
    return ![...occupied.values()].some(
      (session) =>
        start.minute < sessionMinute(session.endTime) &&
        end.minute > sessionMinute(session.startTime),
    );
  });
  const items = available
    .slice(params.skip, params.skip + params.limit)
    .map(({ registrations, attendanceRecords, ...event }) => ({
      ...decorateEvent(event),
      registrationStatus: registrations[0]?.status ?? null,
      attendanceConfirmed: attendanceRecords.length > 0,
    }));
  return { items, pagination: createPaginationMeta(available.length, params) };
}
