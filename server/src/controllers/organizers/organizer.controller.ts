import type { Request, Response } from "express";
import { OrganizingUnitType } from "@prisma/client";
import type { AuthContext } from "@middleware/auth.middleware";
import { getEventAccess } from "@services/events/event-access.service";
import * as organizer from "@services/organizers/organizer.service";
import {
  enumInput,
  objectInput,
  optionalQuery,
  searchInput,
  textInput,
  uuidInput,
} from "@utils/crudValidation";
import { parsePagination } from "@utils/pagination";

function input(req: Request): organizer.ClubInput {
  const body = objectInput(req.body);
  return {
    code: textInput(body.code, "code", 50).toUpperCase(),
    name: textInput(body.name, "name", 150),
    facultyId:
      body.facultyId === null || body.facultyId === "" || body.facultyId === undefined
        ? null
        : uuidInput(body.facultyId, "facultyId"),
  };
}

export async function listOrganizers(req: Request, res: Response) {
  const access = await getEventAccess((res.locals.auth as AuthContext).sub);
  const result = await organizer.listOrganizers(
    parsePagination(req.query, { maxOffset: 10000 }),
    {
      search: optionalQuery(req.query.search, searchInput),
      type: optionalQuery(req.query.type, (value) =>
        enumInput(value, Object.values(OrganizingUnitType), "type"),
      ),
      facultyId: optionalQuery(req.query.facultyId, (value) => uuidInput(value, "facultyId")),
    },
    access,
    req.query.writable === "true",
  );
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function createOrganizer(req: Request, res: Response) {
  res.status(201).json({ ok: true, data: await organizer.createClub(input(req)) });
}
export async function updateOrganizer(req: Request, res: Response) {
  res.json({ ok: true, data: await organizer.updateClub(uuidInput(req.params.id), input(req)) });
}
export async function deleteOrganizer(req: Request, res: Response) {
  await organizer.deleteClub(uuidInput(req.params.id));
  res.status(204).end();
}
