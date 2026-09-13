import type { Request, Response } from "express";
import type { AuthContext } from "@middleware/auth.middleware";
import * as service from "@services/academic/faculty-user.service";
import { ApiError } from "@utils/ApiError";
import {
  objectInput,
  optionalQuery,
  searchInput,
  textInput,
  uuidInput,
} from "@utils/crudValidation";
import { parsePagination } from "@utils/pagination";

const actor = (res: Response) => (res.locals.auth as AuthContext).sub;
function input(req: Request): service.FacultyUserInput {
  const body = objectInput(req.body);
  const roleName = body.roleName;
  if (roleName !== "STUDENT" && roleName !== "EVENT_ORGANIZER")
    throw new ApiError(400, "Only STUDENT or EVENT_ORGANIZER can be managed");
  return {
    email: textInput(body.email, "email", 150),
    name: textInput(body.name, "name", 100),
    password: typeof body.password === "string" && body.password ? body.password : undefined,
    roleName,
    studentCode: typeof body.studentCode === "string" ? body.studentCode : null,
    classId: typeof body.classId === "string" ? uuidInput(body.classId, "classId") : null,
  };
}
export async function list(req: Request, res: Response) {
  const result = await service.listFacultyUsers(
    actor(res),
    parsePagination(req.query),
    optionalQuery(req.query.search, searchInput),
  );
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}
export async function create(req: Request, res: Response) {
  res.status(201).json({ ok: true, data: await service.createFacultyUser(actor(res), input(req)) });
}
export async function update(req: Request, res: Response) {
  res.json({
    ok: true,
    data: await service.updateFacultyUser(actor(res), uuidInput(req.params.id), input(req)),
  });
}
export async function status(req: Request, res: Response) {
  const body = objectInput(req.body);
  if (body.status !== "ACTIVE" && body.status !== "DISABLED")
    throw new ApiError(400, "Invalid status");
  res.json({
    ok: true,
    data: await service.setFacultyStaffStatus(actor(res), uuidInput(req.params.id), body.status),
  });
}
export async function removeStudent(req: Request, res: Response) {
  await service.deleteFacultyStudent(actor(res), uuidInput(req.params.id));
  res.status(204).end();
}
