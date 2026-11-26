import type { Request, Response } from "express";
import * as rbac from "@services/rbac/rbac.service";
import { ApiError } from "@utils/ApiError";
import { parsePagination } from "@utils/pagination";

function roleInput(req: Request): {
  name: string;
  displayName?: string | null;
  permissionIds: string[];
} {
  const { name, displayName, permissionIds = [] } = req.body ?? {};
  if (
    typeof name !== "string" ||
    !Array.isArray(permissionIds) ||
    permissionIds.some((id) => typeof id !== "string")
  ) {
    throw new ApiError(400, "name and permissionIds are invalid");
  }
  if (displayName !== undefined && displayName !== null && typeof displayName !== "string") {
    throw new ApiError(400, "displayName must be a string or null");
  }
  return { name, displayName, permissionIds };
}

function permissionDescriptionInput(req: Request): string | null | undefined {
  const { description } = req.body ?? {};
  if (description !== undefined && description !== null && typeof description !== "string") {
    throw new ApiError(400, "Permission description must be a string or null");
  }
  return description;
}

export async function listPermissions(req: Request, res: Response) {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const result = await rbac.listPermissions(parsePagination(req.query), search);
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}
export async function updatePermission(req: Request, res: Response) {
  const description = permissionDescriptionInput(req);
  res.json({ ok: true, data: await rbac.updatePermission(req.params.id, description) });
}
export async function listRoles(req: Request, res: Response) {
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const result = await rbac.listRoles(parsePagination(req.query), search);
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}
export async function createRole(req: Request, res: Response) {
  const input = roleInput(req);
  res
    .status(201)
    .json({
      ok: true,
      data: await rbac.createRole(input.name, input.permissionIds, input.displayName),
    });
}
export async function updateRole(req: Request, res: Response) {
  const input = roleInput(req);
  res.json({
    ok: true,
    data: await rbac.updateRole(req.params.id, input.name, input.permissionIds, input.displayName),
  });
}
export async function deleteRole(req: Request, res: Response) {
  await rbac.deleteRole(req.params.id);
  res.status(204).end();
}
