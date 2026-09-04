import type { Request, Response } from "express";
import * as rbac from "@services/rbac.service";
import { ApiError } from "@utils/ApiError";
import { parsePagination } from "@utils/pagination";

function roleInput(req: Request): { name: string; permissionIds: string[] } {
  const { name, permissionIds = [] } = req.body ?? {};
  if (typeof name !== "string" || !Array.isArray(permissionIds) || permissionIds.some((id) => typeof id !== "string")) {
    throw new ApiError(400, "name and permissionIds are invalid");
  }
  return { name, permissionIds };
}

function permissionInput(req: Request): { permission: string; description?: string | null } {
  const { permission, description } = req.body ?? {};
  if (typeof permission !== "string") {
    throw new ApiError(400, "Permission name is required");
  }
  if (description !== undefined && description !== null && typeof description !== "string") {
    throw new ApiError(400, "Permission description must be a string or null");
  }
  return { permission, description };
}

export async function listPermissions(req: Request, res: Response) {
  const result = await rbac.listPermissions(parsePagination(req.query));
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}
export async function createPermission(req: Request, res: Response) {
  const input = permissionInput(req);
  res.status(201).json({ ok: true, data: await rbac.createPermission(input) });
}
export async function updatePermission(req: Request, res: Response) {
  const input = permissionInput(req);
  res.json({ ok: true, data: await rbac.updatePermission(req.params.id, input) });
}
export async function deletePermission(req: Request, res: Response) { await rbac.deletePermission(req.params.id); res.status(204).end(); }
export async function listRoles(req: Request, res: Response) {
  const result = await rbac.listRoles(parsePagination(req.query));
  res.json({ ok: true, data: result.items, pagination: result.pagination });
}
export async function createRole(req: Request, res: Response) { const input = roleInput(req); res.status(201).json({ ok: true, data: await rbac.createRole(input.name, input.permissionIds) }); }
export async function updateRole(req: Request, res: Response) { const input = roleInput(req); res.json({ ok: true, data: await rbac.updateRole(req.params.id, input.name, input.permissionIds) }); }
export async function deleteRole(req: Request, res: Response) { await rbac.deleteRole(req.params.id); res.status(204).end(); }
