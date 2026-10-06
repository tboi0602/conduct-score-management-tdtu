import {
  CheckInMode,
  EventRegistrationStatus,
  type OrganizingUnitType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@config/prisma";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";
export type RegistrationView = "UPCOMING" | "ATTENDED" | "ABSENT" | "CANCELLED";
export type RegistrationFilter = EventRegistrationStatus | "ATTENDED" | "ABSENT";
export type PublicEventFilters = {
  search?: string;
  criteriaId?: string;
  organizerId?: string;
  startsFrom?: Date;
  startsTo?: Date;
  registered?: boolean;
  type?: OrganizingUnitType;
  status?: "UPCOMING" | "ONGOING" | "COMPLETED";
};

export const publicEventSelect = {
  id: true,
  name: true,
  descriptionPreview: true,
  images: true,
  location: true,
  deliveryMode: true,
  organizerId: true,
  criteriaId: true,
  semesterId: true,
  timeStart: true,
  timeEnd: true,
  registrationStart: true,
  registrationEnd: true,
  capacity: true,
  registeredCount: true,
  points: true,
  type: true,
  checkInMode: true,
  attendanceRadiusMeters: true,
  organizer: {
    select: {
      id: true,
      type: true,
      code: true,
      name: true,
      facultyId: true,
      classId: true,
      faculty: { select: { id: true, code: true, name: true } },
      class: { select: { id: true, code: true, name: true } },
    },
  },
  criteria: { select: { id: true, title: true, maxPoints: true } },
  semester: { select: { id: true, year: true, type: true, startDate: true, endDate: true } },
} satisfies Prisma.EventSelect;

export async function studentForUser(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!student) throw new ApiError(409, "Student profile is required");
  return student;
}

export function decorateEvent<
  T extends {
    capacity: number | null;
    registeredCount: number;
    registrationStart: Date;
    registrationEnd: Date;
  },
>(event: T) {
  const registeredCount = event.registeredCount;
  const now = new Date();
  return {
    ...event,
    registeredCount,
    remainingSlots: event.capacity === null ? null : Math.max(event.capacity - registeredCount, 0),
    registrationOpen: now >= event.registrationStart && now <= event.registrationEnd,
  };
}

export async function listPublicEvents(
  userId: string,
  params: PaginationParams,
  filters: PublicEventFilters,
) {
  const student = await studentForUser(userId);
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
    AND: [statusCondition],
    name: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
    criteriaId: filters.criteriaId,
    organizerId: filters.organizerId,
    type: filters.type,
    timeStart: { gte: filters.startsFrom, lte: filters.startsTo },
    registrations:
      filters.registered === undefined
        ? undefined
        : filters.registered
          ? { some: { studentId: student.id, status: "REGISTERED" } }
          : { none: { studentId: student.id, status: "REGISTERED" } },
  };
  const [total, items] = await prisma.$transaction([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      select: {
        ...publicEventSelect,
        registrations: {
          where: { studentId: student.id },
          select: { status: true, registeredAt: true, cancelledAt: true },
          take: 1,
        },
      },
      orderBy: [{ timeStart: "asc" }, { id: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return {
    items: items.map((event) => ({
      ...decorateEvent(event),
      registrationStatus: event.registrations[0]?.status ?? null,
    })),
    pagination: createPaginationMeta(total, params),
  };
}

export async function listPublicOrganizerOptions(
  params: PaginationParams,
  filters: { search?: string; type?: OrganizingUnitType },
) {
  const where: Prisma.OrganizingUnitWhereInput = {
    type: filters.type,
    OR: filters.search
      ? [
          { code: { contains: filters.search, mode: "insensitive" } },
          { name: { contains: filters.search, mode: "insensitive" } },
          { faculty: { name: { contains: filters.search, mode: "insensitive" } } },
          { class: { name: { contains: filters.search, mode: "insensitive" } } },
          { class: { code: { contains: filters.search, mode: "insensitive" } } },
        ]
      : undefined,
  };
  const select = {
    id: true,
    type: true,
    code: true,
    name: true,
    facultyId: true,
    classId: true,
    faculty: { select: { id: true, code: true, name: true } },
    class: { select: { id: true, code: true, name: true } },
  } satisfies Prisma.OrganizingUnitSelect;
  const [total, items] = await prisma.$transaction([
    prisma.organizingUnit.count({ where }),
    prisma.organizingUnit.findMany({
      where,
      select,
      orderBy: [{ type: "asc" }, { code: "asc" }, { id: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return { items, pagination: createPaginationMeta(total, params) };
}

export async function getPublicEvent(userId: string, eventId: string) {
  const student = await studentForUser(userId);
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      ...publicEventSelect,
      description: true,
      registrations: {
        where: { studentId: student.id },
        select: { status: true, registeredAt: true, cancelledAt: true },
        take: 1,
      },
    },
  });
  if (!event) throw new ApiError(404, "Event not found");
  return {
    ...decorateEvent(event),
    registrationStatus: event.registrations[0]?.status ?? null,
  };
}

function hasDirection(
  direction: "CHECK_IN" | "CHECK_OUT",
): Prisma.AttendanceRecordListRelationFilter {
  return { some: { direction, status: { in: ["ATTENDED", "LATE"] } } };
}

export function registrationParticipation(
  event: { checkInMode: CheckInMode; timeEnd: Date },
  attendance: Array<{ direction: string; status: string }>,
) {
  if (new Date() < event.timeEnd) return "UPCOMING" as const;
  const valid = (direction: string) =>
    attendance.some((item) => item.direction === direction && item.status !== "ABSENT");
  return valid("CHECK_IN") && (event.checkInMode === "ONE_WAY" || valid("CHECK_OUT"))
    ? ("ATTENDED" as const)
    : ("ABSENT" as const);
}

export async function listMyRegistrations(
  userId: string,
  params: PaginationParams,
  view?: RegistrationView,
) {
  const student = await studentForUser(userId);
  const now = new Date();
  const where: Prisma.EventRegistrationWhereInput = { studentId: student.id };
  if (view === "CANCELLED") where.status = "CANCELLED";
  else {
    where.status = "REGISTERED";
    if (view === "UPCOMING") where.event = { timeEnd: { gte: now } };
    if (view === "ATTENDED") {
      where.event = {
        timeEnd: { lt: now },
        OR: [
          { checkInMode: "ONE_WAY", attendanceRecords: hasDirection("CHECK_IN") },
          {
            checkInMode: "TWO_WAY",
            AND: [
              { attendanceRecords: hasDirection("CHECK_IN") },
              { attendanceRecords: hasDirection("CHECK_OUT") },
            ],
          },
        ],
      };
    }
    if (view === "ABSENT") {
      where.event = {
        timeEnd: { lt: now },
        OR: [
          {
            checkInMode: "ONE_WAY",
            attendanceRecords: {
              none: { direction: "CHECK_IN", status: { in: ["ATTENDED", "LATE"] } },
            },
          },
          {
            checkInMode: "TWO_WAY",
            OR: [
              {
                attendanceRecords: {
                  none: { direction: "CHECK_IN", status: { in: ["ATTENDED", "LATE"] } },
                },
              },
              {
                attendanceRecords: {
                  none: { direction: "CHECK_OUT", status: { in: ["ATTENDED", "LATE"] } },
                },
              },
            ],
          },
        ],
      };
    }
  }
  const [total, items] = await prisma.$transaction([
    prisma.eventRegistration.count({ where }),
    prisma.eventRegistration.findMany({
      where,
      select: {
        id: true,
        status: true,
        registeredAt: true,
        cancelledAt: true,
        event: {
          select: {
            ...publicEventSelect,
            attendanceRecords: {
              where: { studentId: student.id },
              select: { direction: true, status: true },
            },
          },
        },
      },
      orderBy: [{ registeredAt: "desc" }, { id: "desc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return {
    items: items.map((item) => ({
      ...item,
      participationStatus:
        item.status === "CANCELLED"
          ? "CANCELLED"
          : registrationParticipation(item.event, item.event.attendanceRecords),
      event: {
        ...decorateEvent(item.event),
        registrationStatus: item.status,
      },
    })),
    pagination: createPaginationMeta(total, params),
  };
}
