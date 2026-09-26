import {
  CheckInMode,
  EventRegistrationStatus,
  type OrganizingUnitType,
  Prisma,
} from "@prisma/client";

import { prisma } from "@config/prisma";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";
import { eventScope, type EventAccess } from "@services/events/event-access.service";
import { invalidateDashboardCache } from "@services/dashboard/dashboard.service";

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

const publicEventSelect = {
  id: true,
  name: true,
  descriptionPreview: true,
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

async function studentForUser(userId: string) {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!student) throw new ApiError(409, "Student profile is required");
  return student;
}

function decorateEvent<
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
  const where: Prisma.EventWhereInput = {
    deliveryMode: "OFFLINE",
    timeStart: { gt: now, gte: filters.startsFrom, lte: filters.startsTo },
    registrationEnd: { gte: now },
    name: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
    criteriaId: filters.criteriaId,
    organizerId: filters.organizerId,
    type: filters.type,
    registrations: { none: { studentId: student.id, status: "REGISTERED" } },
  };
  // Prisma cannot compare two columns in a portable filter. Fetch open candidates, then apply
  // capacity and recurring/exception schedule rules before slicing the requested page.
  const candidates = await prisma.event.findMany({
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
  });
  const available = candidates.filter((event) => {
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
  const items = available.slice(params.skip, params.skip + params.limit).map((event) => ({
    ...decorateEvent(event),
    registrationStatus: event.registrations[0]?.status ?? null,
  }));
  return { items, pagination: createPaginationMeta(available.length, params) };
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

function registrationParticipation(
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

async function register(eventId: string, studentId: string, actorUserId: string, bypass: boolean) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const event = await tx.event.findUnique({
          where: { id: eventId },
          select: {
            id: true,
            capacity: true,
            registeredCount: true,
            registrationStart: true,
            registrationEnd: true,
          },
        });
        if (!event) throw new ApiError(404, "Event not found");
        const student = await tx.student.findUnique({
          where: { id: studentId },
          select: { id: true },
        });
        if (!student) throw new ApiError(404, "Student not found");
        const now = new Date();
        if (!bypass && now < event.registrationStart)
          throw new ApiError(409, "Registration has not opened");
        if (!bypass && now > event.registrationEnd)
          throw new ApiError(409, "Registration has closed");
        const registration = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          INSERT INTO "event_registrations" (
            "id", "eventId", "studentId", "status", "registeredAt",
            "registeredByUserId", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), ${eventId}::uuid, ${studentId}::uuid,
            'REGISTERED'::"EventRegistrationStatus", ${now}, ${actorUserId}::uuid,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT ("eventId", "studentId") DO UPDATE SET
            "status" = 'REGISTERED'::"EventRegistrationStatus",
            "registeredAt" = EXCLUDED."registeredAt",
            "registeredByUserId" = EXCLUDED."registeredByUserId",
            "cancelledAt" = NULL,
            "cancelledByUserId" = NULL,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "event_registrations"."status" = 'CANCELLED'::"EventRegistrationStatus"
          RETURNING "id"
        `);
        if (registration.length === 0) throw new ApiError(409, "Student is already registered");

        const updated = await tx.event.updateMany({
          where: bypass
            ? { id: eventId }
            : {
                id: eventId,
                registrationStart: { lte: now },
                registrationEnd: { gte: now },
                OR: [{ capacity: null }, { registeredCount: { lt: event.capacity ?? 0 } }],
              },
          data: { registeredCount: { increment: 1 } },
        });
        if (updated.count === 0) {
          const latest = await tx.event.findUnique({
            where: { id: eventId },
            select: {
              capacity: true,
              registeredCount: true,
              registrationStart: true,
              registrationEnd: true,
            },
          });
          if (!latest) throw new ApiError(404, "Event not found");
          if (now < latest.registrationStart)
            throw new ApiError(409, "Registration has not opened");
          if (now > latest.registrationEnd) throw new ApiError(409, "Registration has closed");
          throw new ApiError(409, "Event is full");
        }
        return registration[0];
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      )
        continue;
      throw error;
    }
  }
  throw new ApiError(409, "Registration conflict; please retry");
}

async function cancel(eventId: string, studentId: string, actorUserId: string, bypass: boolean) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id: eventId },
      select: { registrationEnd: true },
    });
    if (!event) throw new ApiError(404, "Event not found");
    const now = new Date();
    if (!bypass && now > event.registrationEnd)
      throw new ApiError(409, "Cancellation period has ended");
    const cancelled = await tx.eventRegistration.updateMany({
      where: { eventId, studentId, status: "REGISTERED" },
      data: { status: "CANCELLED", cancelledAt: now, cancelledByUserId: actorUserId },
    });
    if (cancelled.count === 0) throw new ApiError(409, "Active registration not found");
    await tx.$executeRaw(Prisma.sql`
      UPDATE "events"
      SET "registeredCount" = GREATEST("registeredCount" - 1, 0)
      WHERE "id" = ${eventId}::uuid
    `);
    return { eventId, studentId, status: "CANCELLED" as const, cancelledAt: now };
  });
}

async function invalidateEventDashboard(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizer: { select: { facultyId: true } } },
  });
  await invalidateDashboardCache(event?.organizer?.facultyId);
}

export async function registerSelf(userId: string, eventId: string) {
  const student = await studentForUser(userId);
  await register(eventId, student.id, userId, false);
  await invalidateEventDashboard(eventId);
  return getPublicEvent(userId, eventId);
}

export async function cancelSelf(userId: string, eventId: string) {
  const student = await studentForUser(userId);
  await cancel(eventId, student.id, userId, false);
  await invalidateEventDashboard(eventId);
  return getPublicEvent(userId, eventId);
}

async function assertManagedEvent(eventId: string, access: EventAccess) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, ...eventScope(access) },
    select: { id: true, checkInMode: true, timeEnd: true },
  });
  if (!event) throw new ApiError(404, "Event not found");
  return event;
}

export async function registerForStudent(access: EventAccess, eventId: string, studentId: string) {
  await assertManagedEvent(eventId, access);
  const result = await register(eventId, studentId, access.userId, true);
  await invalidateEventDashboard(eventId);
  return result;
}

export async function cancelForStudent(access: EventAccess, eventId: string, studentId: string) {
  await assertManagedEvent(eventId, access);
  const result = await cancel(eventId, studentId, access.userId, true);
  await invalidateEventDashboard(eventId);
  return result;
}

export async function listManagedRegistrations(
  access: EventAccess,
  eventId: string,
  params: PaginationParams,
  search?: string,
  status?: RegistrationFilter,
) {
  const event = await assertManagedEvent(eventId, access);
  const now = new Date();
  const searchCondition: Prisma.EventRegistrationWhereInput | undefined = search
    ? {
        OR: [
          { student: { studentCode: { contains: search, mode: "insensitive" } } },
          { student: { user: { name: { contains: search, mode: "insensitive" } } } },
          { student: { user: { email: { contains: search, mode: "insensitive" } } } },
        ],
      }
    : undefined;
  const where: Prisma.EventRegistrationWhereInput = {
    eventId,
    AND: searchCondition ? [searchCondition] : undefined,
  };
  if (status === "REGISTERED" || status === "CANCELLED") where.status = status;
  if (status === "ATTENDED" || status === "ABSENT") {
    where.status = "REGISTERED";
    if (event.timeEnd >= now) where.id = "00000000-0000-0000-0000-000000000000";
    else if (status === "ATTENDED") {
      const attendanceConditions: Prisma.EventRegistrationWhereInput[] =
        event.checkInMode === "ONE_WAY"
          ? [
              {
                student: {
                  attendanceRecords: {
                    some: { eventId, direction: "CHECK_IN", status: { in: ["ATTENDED", "LATE"] } },
                  },
                },
              },
            ]
          : ["CHECK_IN", "CHECK_OUT"].map((direction) => ({
              student: {
                attendanceRecords: {
                  some: {
                    eventId,
                    direction: direction as "CHECK_IN" | "CHECK_OUT",
                    status: { in: ["ATTENDED", "LATE"] },
                  },
                },
              },
            }));
      where.AND = [
        ...((where.AND as Prisma.EventRegistrationWhereInput[] | undefined) ?? []),
        ...attendanceConditions,
      ];
    } else {
      where.OR =
        event.checkInMode === "ONE_WAY"
          ? [
              {
                student: {
                  attendanceRecords: {
                    none: { eventId, direction: "CHECK_IN", status: { in: ["ATTENDED", "LATE"] } },
                  },
                },
              },
            ]
          : ["CHECK_IN", "CHECK_OUT"].map((direction) => ({
              student: {
                attendanceRecords: {
                  none: {
                    eventId,
                    direction: direction as "CHECK_IN" | "CHECK_OUT",
                    status: { in: ["ATTENDED", "LATE"] },
                  },
                },
              },
            }));
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
        registeredByUser: { select: { id: true, name: true } },
        cancelledByUser: { select: { id: true, name: true } },
        student: {
          select: {
            id: true,
            studentCode: true,
            user: { select: { name: true, email: true } },
            attendanceRecords: { where: { eventId }, select: { direction: true, status: true } },
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
          : registrationParticipation(event, item.student.attendanceRecords),
    })),
    pagination: createPaginationMeta(total, params),
  };
}

export async function searchStudents(
  access: EventAccess,
  eventId: string,
  params: PaginationParams,
  search?: string,
) {
  await assertManagedEvent(eventId, access);
  const where: Prisma.StudentWhereInput = search
    ? {
        OR: [
          { studentCode: { contains: search, mode: "insensitive" } },
          { user: { name: { contains: search, mode: "insensitive" } } },
          { user: { email: { contains: search, mode: "insensitive" } } },
        ],
      }
    : {};
  const [total, items] = await prisma.$transaction([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      select: { id: true, studentCode: true, user: { select: { name: true, email: true } } },
      orderBy: [{ studentCode: "asc" }, { id: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return { items, pagination: createPaginationMeta(total, params) };
}
