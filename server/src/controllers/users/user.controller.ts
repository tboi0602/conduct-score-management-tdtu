import type { Request, Response } from "express";

import type { AuthContext } from "@middleware/auth.middleware";
import * as userService from "@services/users/user.service";
import { ApiError } from "@utils/ApiError";
import { parsePagination } from "@utils/pagination";

function parseInput(req: Request): userService.UserInput {
  const {
    email,
    name,
    password,
    roleIds = [],
    studentCode,
    classId,
    primaryFacultyId,
  } = req.body ?? {};
  if (
    typeof email !== "string" ||
    typeof name !== "string" ||
    (password !== undefined && password !== null && typeof password !== "string") ||
    !Array.isArray(roleIds) ||
    roleIds.some((id) => typeof id !== "string") ||
    (studentCode !== undefined && studentCode !== null && typeof studentCode !== "string") ||
    (classId !== undefined && classId !== null && typeof classId !== "string") ||
    (primaryFacultyId !== undefined &&
      primaryFacultyId !== null &&
      typeof primaryFacultyId !== "string")
  ) {
    throw new ApiError(400, "Invalid user data");
  }
  return { email, name, password, roleIds, studentCode, classId, primaryFacultyId };
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const stringQuery = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : undefined;
  const result = await userService.listUsers(parsePagination(req.query), {
    search: stringQuery(req.query.search),
    facultyId: stringQuery(req.query.facultyId),
    majorId: stringQuery(req.query.majorId),
    classId: stringQuery(req.query.classId),
    roleId: stringQuery(req.query.roleId),
  });
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  res.json({ ok: true, data: await userService.findUserById(req.params.id) });
}

export async function createUser(req: Request, res: Response): Promise<void> {
  res.status(201).json({ ok: true, data: await userService.createUser(parseInput(req)) });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  res.json({
    ok: true,
    data: await userService.updateUser(req.params.id, parseInput(req)),
  });
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const auth = res.locals.auth as AuthContext;
  await userService.deleteUser(auth.sub, req.params.id);
  res.status(204).end();
}
