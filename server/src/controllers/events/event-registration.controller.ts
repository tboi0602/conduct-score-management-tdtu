import type { Request, Response } from "express";
import { EventRegistrationStatus, OrganizingUnitType } from "@prisma/client";

import type { AuthContext } from "@middleware/auth.middleware";
import { getEventAccess } from "@services/events/event-access.service";
import * as registrations from "@services/events/event-registration.service";
import {
  dateInput,
  enumInput,
  objectInput,
  optionalQuery,
  searchInput,
  uuidInput,
} from "@utils/crudValidation";
import { parsePagination } from "@utils/pagination";
import { ApiError } from "@utils/ApiError";

const auth = (res: Response) => res.locals.auth as AuthContext;

export async function listPublic(req: Request, res: Response) {
  const result = await registrations.listPublicEvents(
    auth(res).sub,
    parsePagination(req.query, { maxOffset: 10000 }),
    {
      search: optionalQuery(req.query.search, searchInput),
      criteriaId: optionalQuery(req.query.criteriaId, (value) => uuidInput(value, "criteriaId")),
      organizerId: optionalQuery(req.query.organizerId, (value) => uuidInput(value, "organizerId")),
      startsFrom: optionalQuery(req.query.startsFrom, (value) => dateInput(value, "startsFrom")),
      startsTo: optionalQuery(req.query.startsTo, (value) => dateInput(value, "startsTo")),
      registered: req.query.registered === undefined ? undefined : req.query.registered === "true",
      type: optionalQuery(req.query.type, (value) =>
        enumInput(value, Object.values(OrganizingUnitType), "type"),
      ),
      status: optionalQuery(req.query.status, (value) =>
        enumInput(value, ["UPCOMING", "ONGOING", "COMPLETED"] as const, "status"),
      ),
    },
  );
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function listRecommended(req: Request, res: Response) {
  const result = await registrations.listRecommendedEvents(
    auth(res).sub,
    parsePagination(req.query, { maxOffset: 10000 }),
    {
      search: optionalQuery(req.query.search, searchInput),
      criteriaId: optionalQuery(req.query.criteriaId, (value) => uuidInput(value, "criteriaId")),
      organizerId: optionalQuery(req.query.organizerId, (value) => uuidInput(value, "organizerId")),
      startsFrom: optionalQuery(req.query.startsFrom, (value) => dateInput(value, "startsFrom")),
      startsTo: optionalQuery(req.query.startsTo, (value) => dateInput(value, "startsTo")),
      type: optionalQuery(req.query.type, (value) =>
        enumInput(value, Object.values(OrganizingUnitType), "type"),
      ),
    },
  );
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function publicOrganizerOptions(req: Request, res: Response) {
  const result = await registrations.listPublicOrganizerOptions(
    parsePagination(req.query, { maxOffset: 10000 }),
    {
      search: optionalQuery(req.query.search, searchInput),
      type: optionalQuery(req.query.type, (value) =>
        enumInput(value, Object.values(OrganizingUnitType), "type"),
      ),
    },
  );
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function getPublic(req: Request, res: Response) {
  res.json({
    ok: true,
    data: await registrations.getPublicEvent(auth(res).sub, uuidInput(req.params.id)),
  });
}

export async function listMine(req: Request, res: Response) {
  const view = optionalQuery(req.query.view, (value) =>
    enumInput(value, ["UPCOMING", "ATTENDED", "ABSENT", "CANCELLED"] as const, "view"),
  );
  const result = await registrations.listMyRegistrations(
    auth(res).sub,
    parsePagination(req.query, { maxOffset: 10000 }),
    view,
  );
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function registerSelf(req: Request, res: Response) {
  res.status(201).json({
    ok: true,
    data: await registrations.registerSelf(auth(res).sub, uuidInput(req.params.id)),
  });
}

export async function cancelSelf(req: Request, res: Response) {
  res.json({
    ok: true,
    data: await registrations.cancelSelf(auth(res).sub, uuidInput(req.params.id)),
  });
}

export async function listManaged(req: Request, res: Response) {
  const status = optionalQuery(req.query.status, (value) =>
    enumInput(
      value,
      [...Object.values(EventRegistrationStatus), "ATTENDED", "ABSENT"] as const,
      "status",
    ),
  );
  const result = await registrations.listManagedRegistrations(
    await getEventAccess(auth(res).sub),
    uuidInput(req.params.id),
    parsePagination(req.query, { maxOffset: 10000 }),
    optionalQuery(req.query.search, searchInput),
    status,
  );
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function registerManaged(req: Request, res: Response) {
  const body = objectInput(req.body);
  res.status(201).json({
    ok: true,
    data: await registrations.registerForStudent(
      await getEventAccess(auth(res).sub),
      uuidInput(req.params.id),
      uuidInput(body.studentId, "studentId"),
    ),
  });
}

export async function cancelManaged(req: Request, res: Response) {
  res.json({
    ok: true,
    data: await registrations.cancelForStudent(
      await getEventAccess(auth(res).sub),
      uuidInput(req.params.id),
      uuidInput(req.params.studentId, "studentId"),
    ),
  });
}

export async function searchStudents(req: Request, res: Response) {
  const result = await registrations.searchStudents(
    await getEventAccess(auth(res).sub),
    uuidInput(req.params.id),
    parsePagination(req.query, { maxOffset: 10000 }),
    optionalQuery(req.query.search, searchInput),
  );
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}
