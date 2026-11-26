import { prisma } from "@config/prisma";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";

const roleInclude = {
  rolePermissions: { include: { permission: true } },
  _count: { select: { userRoles: true } },
} as const;

function normalizeDescription(description: string | null | undefined): string | null | undefined {
  if (description === undefined) return undefined;
  if (description === null) return null;

  const value = description.trim();
  if (value.length > 255) {
    throw new ApiError(400, "Permission description cannot exceed 255 characters");
  }
  return value || null;
}

export async function listPermissions(params: PaginationParams, search?: string) {
  const keyword = search?.trim();
  const where = keyword
    ? {
        OR: [
          { permission: { contains: keyword, mode: "insensitive" as const } },
          { description: { contains: keyword, mode: "insensitive" as const } },
        ],
      }
    : undefined;
  const [total, items] = await prisma.$transaction([
    prisma.permission.count({ where }),
    prisma.permission.findMany({
      where,
      orderBy: [{ permission: "asc" }, { id: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);

  return { items, pagination: createPaginationMeta(total, params) };
}

export async function updatePermission(id: string, rawDescription?: string | null) {
  const current = await prisma.permission.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, "Permission not found");
  const description = normalizeDescription(rawDescription);
  return prisma.permission
    .update({
      where: { id },
      data: {
        ...(description !== undefined ? { description } : {}),
      },
    })
    .catch(mapNotFoundOrConflict);
}

export async function listRoles(params: PaginationParams, search?: string) {
  const keyword = search?.trim();
  const where = keyword
    ? {
        OR: [
          { code: { contains: keyword, mode: "insensitive" as const } },
          { displayName: { contains: keyword, mode: "insensitive" as const } },
        ],
      }
    : undefined;
  const [total, items] = await prisma.$transaction([
    prisma.role.count({ where }),
    prisma.role.findMany({
      where,
      include: roleInclude,
      orderBy: [{ code: "asc" }, { id: "asc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);

  return { items, pagination: createPaginationMeta(total, params) };
}

async function assertPermissionIds(permissionIds: string[]): Promise<void> {
  const count = await prisma.permission.count({ where: { id: { in: permissionIds } } });
  if (count !== new Set(permissionIds).size)
    throw new ApiError(400, "One or more permissions do not exist");
}

export async function createRole(code: string, permissionIds: string[], displayName?: string | null) {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) throw new ApiError(400, "Role code is required");
  if (permissionIds.length) await assertPermissionIds(permissionIds);
  return prisma.role
    .create({
      data: {
        code: normalizedCode,
        displayName: displayName?.trim() || null,
        rolePermissions: {
          create: [...new Set(permissionIds)].map((permissionId) => ({ permissionId })),
        },
      },
      include: roleInclude,
    })
    .catch(mapNotFoundOrConflict);
}

export async function updateRole(
  id: string,
  code: string,
  permissionIds: string[],
  displayName?: string | null,
) {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) throw new ApiError(400, "Role code is required");
  if (permissionIds.length) await assertPermissionIds(permissionIds);
  return prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId: id } });
    return tx.role
      .update({
        where: { id },
        data: {
          code: normalizedCode,
          ...(displayName !== undefined ? { displayName: displayName?.trim() || null } : {}),
          rolePermissions: {
            create: [...new Set(permissionIds)].map((permissionId) => ({ permissionId })),
          },
        },
        include: roleInclude,
      })
      .catch(mapNotFoundOrConflict);
  });
}

export async function deleteRole(id: string) {
  await prisma.role.delete({ where: { id } }).catch(mapNotFoundOrConflict);
}

function mapNotFoundOrConflict(error: { code?: string }): never {
  if (error.code === "P2025") throw new ApiError(404, "Resource not found");
  if (error.code === "P2002") throw new ApiError(409, "Name already exists");
  throw error;
}
