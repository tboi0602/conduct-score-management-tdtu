import type { Request, Response } from "express";
import { CheckInMode, EventDeliveryMode, EventType } from "@prisma/client";
import type { AuthContext } from "@middleware/auth.middleware";
import { getEventAccess } from "@services/events/event-access.service";
import { sanitizeEventDescription } from "@utils/eventDescription";
import * as events from "@services/events/event.service";
import { ApiError } from "@utils/ApiError";
import { parsePagination } from "@utils/pagination";
import {
  dateInput,
  enumInput,
  integerInput,
  objectInput,
  optionalQuery,
  searchInput,
  textInput,
  uuidArrayInput,
  uuidInput,
} from "@utils/crudValidation";

function parseInput(req: Request): events.EventInput {
  const body = objectInput(req.body);
  const deliveryMode = enumInput(
    body.deliveryMode === undefined ? EventDeliveryMode.OFFLINE : body.deliveryMode,
    Object.values(EventDeliveryMode),
    "deliveryMode",
  );
  const online = deliveryMode === EventDeliveryMode.ONLINE;
  const capacity =
    online || body.capacity === null || body.capacity === "" || body.capacity === undefined
      ? null
      : integerInput(body.capacity, "capacity");
  if (capacity !== null && capacity < 1)
    throw new ApiError(400, "capacity must be a positive integer or null");
  const images = Array.isArray(body.images)
    ? (body.images as unknown[]).filter(
        (url): url is string => typeof url === "string" && url.trim().length > 0,
      )
    : [];
  return {
    name: textInput(body.name, "name"),
    description: sanitizeEventDescription(body.description ?? ""),
    images,
    location: online ? "" : textInput(body.location, "location"),
    googleFormUrl: online ? textInput(body.googleFormUrl, "googleFormUrl", 2048) : null,
    organizerId: uuidInput(body.organizerId, "organizerId"),
    criteriaId: uuidInput(body.criteriaId, "criteriaId"),
    semesterId: uuidInput(body.semesterId, "semesterId"),
    timeStart: dateInput(body.timeStart, "timeStart"),
    timeEnd: dateInput(body.timeEnd, "timeEnd"),
    registrationStart: online ? null : dateInput(body.registrationStart, "registrationStart"),
    registrationEnd: online ? null : dateInput(body.registrationEnd, "registrationEnd"),
    capacity,
    attendanceRadiusMeters: online
      ? 100
      : integerInput(
          body.attendanceRadiusMeters === undefined ? 100 : body.attendanceRadiusMeters,
          "attendanceRadiusMeters",
        ),
    points: integerInput(body.points === undefined ? 0 : body.points, "points"),
    checkInMode: online
      ? CheckInMode.ONE_WAY
      : enumInput(
          body.checkInMode === undefined ? CheckInMode.ONE_WAY : body.checkInMode,
          Object.values(CheckInMode),
          "checkInMode",
        ),
    deliveryMode,
  };
}

export async function listEvents(req: Request, res: Response): Promise<void> {
  const access = await getEventAccess((res.locals.auth as AuthContext).sub);
  const filters: events.EventFilters = {
    search: optionalQuery(req.query.search, searchInput),
    criteriaId: optionalQuery(req.query.criteriaId, (value) => uuidInput(value, "criteriaId")),
    semesterId: optionalQuery(req.query.semesterId, (value) => uuidInput(value, "semesterId")),
    organizerId: optionalQuery(req.query.organizerId, (value) => uuidInput(value, "organizerId")),
    facultyId: optionalQuery(req.query.facultyId, (value) => uuidInput(value, "facultyId")),
    type: optionalQuery(req.query.type, (value) =>
      enumInput(value, Object.values(EventType), "type"),
    ),
    deliveryMode: optionalQuery(req.query.deliveryMode, (value) =>
      enumInput(value, Object.values(EventDeliveryMode), "deliveryMode"),
    ),
    checkInMode: optionalQuery(req.query.checkInMode, (value) =>
      enumInput(value, Object.values(CheckInMode), "checkInMode"),
    ),
    status: optionalQuery(req.query.status, (value) =>
      enumInput(value, ["UPCOMING", "ONGOING", "COMPLETED"] as const, "status"),
    ),
    startsFrom: optionalQuery(req.query.startsFrom, (value) => dateInput(value, "startsFrom")),
    startsTo: optionalQuery(req.query.startsTo, (value) => dateInput(value, "startsTo")),
  };
  if (filters.startsFrom && filters.startsTo && filters.startsFrom > filters.startsTo) {
    throw new ApiError(400, "startsFrom must not be after startsTo");
  }
  const result = await events.listEvents(
    parsePagination(req.query, { maxOffset: 10000 }),
    filters,
    access,
  );
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function getEvent(req: Request, res: Response): Promise<void> {
  const access = await getEventAccess((res.locals.auth as AuthContext).sub);
  res.json({ ok: true, data: await events.findById(uuidInput(req.params.id), access) });
}

export async function createEvent(req: Request, res: Response): Promise<void> {
  const access = await getEventAccess((res.locals.auth as AuthContext).sub);
  res.status(201).json({ ok: true, data: await events.create(parseInput(req), access) });
}

export async function updateEvent(req: Request, res: Response): Promise<void> {
  const access = await getEventAccess((res.locals.auth as AuthContext).sub);
  res.json({
    ok: true,
    data: await events.updateEvent(uuidInput(req.params.id), parseInput(req), access),
  });
}

export async function deleteEvent(req: Request, res: Response): Promise<void> {
  const access = await getEventAccess((res.locals.auth as AuthContext).sub);
  await events.deleteEvent(uuidInput(req.params.id), access);
  res.status(204).end();
}

export async function deleteEvents(req: Request, res: Response): Promise<void> {
  const access = await getEventAccess((res.locals.auth as AuthContext).sub);
  const body = objectInput(req.body);
  res.json({ ok: true, data: await events.deleteEvents(uuidArrayInput(body.ids), access) });
}
