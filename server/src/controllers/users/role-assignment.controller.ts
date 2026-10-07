import type { Request, Response } from "express";

import type { AuthContext } from "@middleware/auth.middleware";
import {
  listRoleAssignmentUsers,
  updateRoleAssignment,
} from "@services/users/role-assignment.service";
import { objectInput, searchInput } from "@utils/crudValidation";
import { ApiError } from "@utils/ApiError";
import { parsePagination } from "@utils/pagination";

export async function list(req: Request, res: Response): Promise<void> {
  const auth = res.locals.auth as AuthContext;
  const search =
    typeof req.query.search === "string" && req.query.search.trim()
      ? searchInput(req.query.search.trim())
      : undefined;
  const roleId =
    typeof req.query.roleId === "string" && req.query.roleId.trim()
      ? req.query.roleId.trim()
      : undefined;
  const result = await listRoleAssignmentUsers(
    auth.sub,
    parsePagination(req.query),
    search,
    roleId,
  );
  res.json({ ok: true, data: result });
}

export async function update(req: Request, res: Response): Promise<void> {
  const body = objectInput(req.body);
  if (
    !Array.isArray(body.roleIds) ||
    body.roleIds.some((roleId) => typeof roleId !== "string") ||
    (body.primaryFacultyId !== undefined &&
      body.primaryFacultyId !== null &&
      typeof body.primaryFacultyId !== "string")
  ) {
    throw new ApiError(400, "Invalid role assignment");
  }
  const auth = res.locals.auth as AuthContext;
  const data = await updateRoleAssignment(auth.sub, req.params.id, {
    roleIds: body.roleIds as string[],
    ...(body.primaryFacultyId !== undefined
      ? { primaryFacultyId: body.primaryFacultyId as string | null }
      : {}),
  });
  res.json({ ok: true, data });
}
