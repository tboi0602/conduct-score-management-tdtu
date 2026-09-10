import { prisma } from "@config/prisma";
import { ApiError } from "@utils/ApiError";
import {
  createPaginationMeta,
  type PaginationParams,
} from "@utils/pagination";

const roleInclude = {
  rolePermissions: { include: { permission: true } },
  _count: { select: { userRoles: true } },
} as const;

const PERMISSION_NAME_PATTERN = /^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/;

type PermissionInput = {
  permission: string;
  description?: string | null;
};

function normalizePermissionName(permission: string): string {
  const value = permission.trim();
  if (!value) throw new ApiError(400, "Permission name is required");
  if (!PERMISSION_NAME_PATTERN.test(value)) {
    throw new ApiError(400, "Permission must follow the resource.action format");
  }
  return value;
}

function normalizeDescription(description: string | null | undefined): string | null | undefined {
  if (description === undefined) return undefined;
  if (description === null) return null;

  const value = description.trim();
  if (value.length > 255) {
    throw new ApiError(400, "Permission description cannot exceed 255 characters");
  }
  return value || null;
}

export async function listPermissions(params: PaginationParams) {
  const [total, items] = await prisma.$transaction([
    prisma.permission.count(),
    prisma.permission.findMany({
      orderBy: [{ permission: "asc" }, { id: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);

  return { items, pagination: createPaginationMeta(total, params) };
}

export async function createPermission(input: PermissionInput) {
  const value = normalizePermissionName(input.permission);
  const description = normalizeDescription(input.description) ?? null;
  return prisma.permission.create({ data: { permission: value, description } }).catch((error: { code?: string }) => {
    if (error.code === "P2002") throw new ApiError(409, "Permission already exists");
    throw error;
  });
}

export async function updatePermission(id: string, input: PermissionInput) {
  const current = await prisma.permission.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, "Permission not found");
  if (current.permission === "*") {
    throw new ApiError(400, "System wildcard permission cannot be modified");
  }
  const value = normalizePermissionName(input.permission);
  const description = normalizeDescription(input.description);
  return prisma.permission.update({
    where: { id },
    data: {
      permission: value,
      ...(description !== undefined ? { description } : {}),
    },
  }).catch(mapNotFoundOrConflict);
}

export async function deletePermission(id: string) {
  const permission = await prisma.permission.findUnique({ where: { id } });
  if (!permission) throw new ApiError(404, "Permission not found");
  if (permission.permission === "*") throw new ApiError(400, "System wildcard permission cannot be deleted");
  await prisma.permission.delete({ where: { id } });
}

export async function listRoles(params: PaginationParams) {
  const [total, items] = await prisma.$transaction([
    prisma.role.count(),
    prisma.role.findMany({
      include: roleInclude,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);

  return { items, pagination: createPaginationMeta(total, params) };
}

async function assertPermissionIds(permissionIds: string[]): Promise<void> {
  const count = await prisma.permission.count({ where: { id: { in: permissionIds } } });
  if (count !== new Set(permissionIds).size) throw new ApiError(400, "One or more permissions do not exist");
}

export async function createRole(name: string, permissionIds: string[]) {
  void name;
  void permissionIds;
  throw new ApiError(409, "System roles are fixed; only four seeded roles are supported");
}

export async function updateRole(id: string, name: string, permissionIds: string[]) {
  void id;
  void name;
  void permissionIds;
  throw new ApiError(409, "System role definitions are managed by the authorization seed");
}

export async function deleteRole(id: string) {
  void id;
  throw new ApiError(409, "System roles cannot be deleted");
}

function mapNotFoundOrConflict(error: { code?: string }): never {
  if (error.code === "P2025") throw new ApiError(404, "Resource not found");
  if (error.code === "P2002") throw new ApiError(409, "Name already exists");
  throw error;
}
