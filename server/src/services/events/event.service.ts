import { Prisma, type CheckInMode, type EventDeliveryMode, type EventType } from "@prisma/client";
import { prisma } from "@config/prisma";
import { ApiError } from "@utils/ApiError";
import { runBulkAction } from "@utils/bulkAction";
import { mapCrudError } from "@utils/crudError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";
import {
  assertOrganizerAccess,
  eventScope,
  type EventAccess,
} from "@services/events/event-access.service";
import { invalidateDashboardCache } from "@modules/dashboard";
import { eventDescriptionPreview } from "@utils/eventDescription";

export type EventInput = {
  name: string;
  description: string;
  images: string[];
  location: string;
  googleFormUrl: string | null;
  organizerId: string;
  criteriaId: string;
  semesterId: string;
  timeStart: Date;
  timeEnd: Date;
  registrationStart: Date | null;
  registrationEnd: Date | null;
  capacity: number | null;
  attendanceRadiusMeters: number;
  points: number;
  checkInMode: CheckInMode;
  deliveryMode: EventDeliveryMode;
};

export type EventFilters = {
  search?: string;
  criteriaId?: string;
  semesterId?: string;
  type?: EventType;
  deliveryMode?: EventDeliveryMode;
  checkInMode?: CheckInMode;
  startsFrom?: Date;
  startsTo?: Date;
  organizerId?: string;
  facultyId?: string;
  status?: "UPCOMING" | "ONGOING" | "COMPLETED";
};

const organizerSelect = {
  id: true,
  type: true,
  code: true,
  name: true,
  facultyId: true,
  faculty: { select: { id: true, code: true, name: true } },
  class: { select: { id: true, code: true, name: true } },
} satisfies Prisma.OrganizingUnitSelect;

const eventSelect = {
  id: true,
  name: true,
  criteriaId: true,
  semesterId: true,
  organizerId: true,
  descriptionPreview: true,
  images: true,
  location: true,
  deliveryMode: true,
  googleFormUrl: true,
  timeStart: true,
  timeEnd: true,
  registrationStart: true,
  registrationEnd: true,
  capacity: true,
  points: true,
  type: true,
  checkInMode: true,
  attendanceRadiusMeters: true,
  registeredCount: true,
  createdAt: true,
  updatedAt: true,
  organizer: { select: organizerSelect },
  criteria: { select: { id: true, title: true, maxPoints: true } },
  semester: { select: { id: true, year: true, type: true, startDate: true, endDate: true } },
} satisfies Prisma.EventSelect;

const eventDetailSelect = { ...eventSelect, description: true } satisfies Prisma.EventSelect;

export async function listEvents(
  params: PaginationParams,
  filters: EventFilters,
  access: EventAccess,
) {
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
      eventScope(access),
      filters.facultyId ? { organizer: { is: { facultyId: filters.facultyId } } } : {},
      statusCondition,
    ],
    name: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
    criteriaId: filters.criteriaId,
    semesterId: filters.semesterId,
    organizerId: filters.organizerId,
    type: filters.type,
    deliveryMode: filters.deliveryMode,
    checkInMode: filters.checkInMode,
    timeStart: { gte: filters.startsFrom, lte: filters.startsTo },
  };
  const [total, items] = await prisma.$transaction([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      select: eventSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return { items, pagination: createPaginationMeta(total, params) };
}

export async function findById(id: string, access: EventAccess) {
  const event = await prisma.event.findFirst({
    where: { id, ...eventScope(access) },
    select: eventDetailSelect,
  });
  if (!event) throw new ApiError(404, "Event not found");
  return event;
}

function validateTimes(input: EventInput): void {
  if (input.timeEnd <= input.timeStart) throw new ApiError(400, "timeEnd must be after timeStart");
  if (input.deliveryMode === "OFFLINE") {
    if (!input.registrationStart || !input.registrationEnd) {
      throw new ApiError(400, "Offline events require a registration window");
    }
    if (input.registrationStart >= input.registrationEnd) {
      throw new ApiError(400, "registrationStart must be before registrationEnd");
    }
    if (input.registrationEnd > input.timeStart) {
      throw new ApiError(400, "registrationEnd must not be after timeStart");
    }
    if (input.capacity !== null && input.capacity < 1) {
      throw new ApiError(400, "capacity must be a positive integer or null");
    }
    if (input.attendanceRadiusMeters < 10 || input.attendanceRadiusMeters > 5000) {
      throw new ApiError(400, "attendanceRadiusMeters must be between 10 and 5000");
    }
    const date = (value: Date) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(value);
    if (date(input.timeStart) !== date(input.timeEnd)) {
      throw new ApiError(400, "Offline events must start and end on the same day");
    }
    return;
  }
  if (!input.googleFormUrl) {
    throw new ApiError(400, "Online events require a Google Form URL", "GOOGLE_FORM_URL_REQUIRED");
  }
  let url: URL;
  try {
    url = new URL(input.googleFormUrl);
  } catch {
    throw new ApiError(400, "googleFormUrl must be a valid URL", "INVALID_GOOGLE_FORM_URL");
  }
  const isGoogleForm =
    url.protocol === "https:" &&
    (url.hostname === "forms.gle" ||
      (url.hostname === "docs.google.com" && url.pathname.startsWith("/forms/")));
  if (!isGoogleForm) {
    throw new ApiError(
      400,
      "googleFormUrl must use docs.google.com/forms or forms.gle",
      "INVALID_GOOGLE_FORM_URL",
    );
  }
  if (
    input.registrationStart !== null ||
    input.registrationEnd !== null ||
    input.capacity !== null ||
    input.checkInMode !== "ONE_WAY"
  ) {
    throw new ApiError(
      400,
      "Online events cannot use registration, capacity, or two-way attendance",
    );
  }
}

export async function create(input: EventInput, access: EventAccess) {
  validateTimes(input);
  const organizer = await assertOrganizerAccess(input.organizerId, access);
  const created = await prisma.event
    .create({
      data: {
        ...input,
        descriptionPreview: eventDescriptionPreview(input.description),
        type: organizer.type as EventType,
      },
      select: eventDetailSelect,
    })
    .catch(mapCrudError);
  await invalidateDashboardCache(organizer.facultyId);
  return created;
}

export async function updateEvent(id: string, input: EventInput, access: EventAccess) {
  validateTimes(input);
  const organizer = await assertOrganizerAccess(input.organizerId, access);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const current = await tx.event.findFirst({
            where: { id, ...eventScope(access) },
            select: {
              id: true,
              deliveryMode: true,
              registeredCount: true,
              organizer: { select: { facultyId: true } },
            },
          });
          if (!current) throw new ApiError(404, "Event not found");
          if (
            input.deliveryMode === "OFFLINE" &&
            input.capacity !== null &&
            input.capacity < current.registeredCount
          ) {
            throw new ApiError(409, "capacity cannot be lower than the active registration count");
          }
          if (input.deliveryMode === "ONLINE") {
            await tx.eventRegistration.deleteMany({ where: { eventId: id } });
          }
          const event = await tx.event.update({
            where: { id },
            data: {
              ...input,
              registeredCount: input.deliveryMode === "ONLINE" ? 0 : undefined,
              descriptionPreview: eventDescriptionPreview(input.description),
              type: organizer.type as EventType,
            },
            select: eventDetailSelect,
          });
          return { event, previousFacultyId: current.organizer?.facultyId };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      await Promise.all([
        invalidateDashboardCache(organizer.facultyId),
        result.previousFacultyId === organizer.facultyId
          ? Promise.resolve()
          : invalidateDashboardCache(result.previousFacultyId),
      ]);
      return result.event;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      )
        continue;
      throw mapCrudError(error);
    }
  }
  throw new ApiError(409, "Event update conflict; please retry");
}

export async function deleteEvent(id: string, access: EventAccess): Promise<void> {
  const current = await prisma.event.findFirst({
    where: { id, ...eventScope(access) },
    select: { id: true, organizer: { select: { facultyId: true } } },
  });
  if (!current) throw new ApiError(404, "Event not found");
  await prisma.event.delete({ where: { id }, select: { id: true } }).catch(mapCrudError);
  await invalidateDashboardCache(current.organizer?.facultyId);
}

export async function deleteEvents(ids: string[], access: EventAccess) {
  return runBulkAction(ids, (id) => deleteEvent(id, access));
}
