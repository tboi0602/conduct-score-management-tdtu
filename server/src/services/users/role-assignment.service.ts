import type { Prisma } from "@prisma/client";

import { prisma } from "@config/prisma";
import { redisClient } from "@redis";
import { getEventAccess } from "@services/events/event-access.service";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";

const targetSelect = {
  id: true,
  name: true,
  email: true,
  primaryFacultyId: true,
  primaryFaculty: { select: { id: true, code: true, name: true } },
  userRoles: { select: { role: { select: { id: true, code: true, displayName: true } } } },
  student: {
    select: {
      studentCode: true,
      class: {
        select: {
          id: true,
          code: true,
          major: {
            select: {
              id: true,
              code: true,
              name: true,
              facultyId: true,
              faculty: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
    },
  },
} as const;

function facultyScope(facultyId: string): Prisma.UserWhereInput {
  return {
    OR: [
      { student: { is: { class: { is: { major: { is: { facultyId } } } } } } },
      { student: { is: null }, primaryFacultyId: facultyId },
    ],
  };
}

export async function listRoleAssignmentUsers(
  actorId: string,
  pagination: PaginationParams,
  search?: string,
  roleId?: string,
) {
  const access = await getEventAccess(actorId);
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: {
      userRoles: {
        select: {
          role: {
            select: {
              rolePermissions: { select: { permission: { select: { permission: true } } } },
            },
          },
        },
      },
    },
  });
  if (!actor) throw new ApiError(401, "User not found");
  const actorPermissions = new Set(
    actor.userRoles.flatMap(({ role }) =>
      role.rolePermissions.map(({ permission }) => permission.permission),
    ),
  );
  const actorHasWildcard = actorPermissions.has("*");
  const where: Prisma.UserWhereInput = {
    id: { not: actorId },
    ...(actorHasWildcard
      ? {}
      : {
          NOT: {
            userRoles: {
              some: { role: { rolePermissions: { some: { permission: { permission: "*" } } } } },
            },
          },
        }),
    ...(access.manageAnyUnit
      ? {}
      : access.facultyId
        ? facultyScope(access.facultyId)
        : { id: "00000000-0000-0000-0000-000000000000" }),
    ...(roleId ? { userRoles: { some: { roleId } } } : {}),
    ...(search
      ? {
          AND: [
            {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { student: { is: { studentCode: { contains: search, mode: "insensitive" } } } },
              ],
            },
          ],
        }
      : {}),
  };
  const [total, items, roles, filterRoles] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: targetSelect,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: pagination.skip,
      take: pagination.limit,
    }),
    prisma.role.findMany({
      where: actorHasWildcard
        ? undefined
        : {
            rolePermissions: {
              every: {
                permission: {
                  permission: { in: [...actorPermissions] },
                },
              },
            },
          },
      select: { id: true, code: true, displayName: true },
      orderBy: { code: "asc" },
    }),
    prisma.role.findMany({
      select: { id: true, code: true, displayName: true },
      orderBy: { code: "asc" },
    }),
  ]);
  const faculties = access.manageAnyUnit
    ? await prisma.faculty.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : access.facultyId
      ? await prisma.faculty.findMany({
          where: { id: access.facultyId },
          select: { id: true, name: true },
        })
      : [];
  return {
    items,
    roles,
    filterRoles,
    faculties,
    pagination: createPaginationMeta(total, pagination),
  };
}

export async function updateRoleAssignment(
  actorId: string,
  targetId: string,
  input: { roleIds: string[]; primaryFacultyId?: string | null },
) {
  if (actorId === targetId) throw new ApiError(403, "You cannot change your own role assignment");
  const access = await getEventAccess(actorId);
  const [actor, target, roles] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actorId },
      select: {
        userRoles: {
          select: {
            role: {
              select: {
                rolePermissions: { select: { permission: { select: { permission: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        student: {
          select: { id: true, class: { select: { major: { select: { facultyId: true } } } } },
        },
        primaryFacultyId: true,
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
                displayName: true,
                rolePermissions: { select: { permission: { select: { permission: true } } } },
              },
            },
          },
        },
      },
    }),
    prisma.role.findMany({
      where: { id: { in: [...new Set(input.roleIds)] } },
      include: {
        rolePermissions: { select: { permission: { select: { permission: true } } } },
      },
    }),
  ]);
  if (!actor || !target) throw new ApiError(404, "User not found");
  const actorPermissions = new Set(
    actor.userRoles.flatMap(({ role }) =>
      role.rolePermissions.map(({ permission }) => permission.permission),
    ),
  );
  const actorHasWildcard = actorPermissions.has("*");
  const targetHasWildcard = target.userRoles.some(({ role }) =>
    role.rolePermissions.some(({ permission }) => permission.permission === "*"),
  );
  if (targetHasWildcard && !actorHasWildcard) {
    throw new ApiError(403, "Accounts with full system access cannot be managed here");
  }
  const targetFacultyId = target.student?.class?.major.facultyId ?? target.primaryFacultyId;
  if (!access.manageAnyUnit && (!access.facultyId || targetFacultyId !== access.facultyId))
    throw new ApiError(403, "User is outside your faculty scope");
  if (roles.length !== new Set(input.roleIds).size) {
    throw new ApiError(400, "One or more selected roles do not exist");
  }
  if (!actorHasWildcard) {
    const hasEscalatedRole = roles.some((role) =>
      role.rolePermissions.some(
        ({ permission }) =>
          permission.permission === "*" || !actorPermissions.has(permission.permission),
      ),
    );
    if (hasEscalatedRole) {
      throw new ApiError(403, "You cannot assign roles with permissions you do not hold");
    }
  }
  if (input.primaryFacultyId !== undefined && !access.manageAnyUnit) {
    if (input.primaryFacultyId !== null && input.primaryFacultyId !== access.facultyId) {
      throw new ApiError(403, "You can only assign users to your own faculty");
    }
  }
  if (input.primaryFacultyId) {
    const faculty = await prisma.faculty.findUnique({
      where: { id: input.primaryFacultyId },
      select: { id: true },
    });
    if (!faculty) throw new ApiError(400, "Primary faculty does not exist");
  }

  const resolvedPrimaryFacultyId =
    target.student && roles.some((role) => role.code === "EVENT_ORGANIZER")
      ? (input.primaryFacultyId ??
        target.primaryFacultyId ??
        target.student.class?.major.facultyId ??
        null)
      : input.primaryFacultyId;

  await prisma.$transaction(async (transaction) => {
    await transaction.userRole.deleteMany({ where: { userId: targetId } });
    if (roles.length) {
      await transaction.userRole.createMany({
        data: roles.map((role) => ({ userId: targetId, roleId: role.id })),
      });
    }
    if (resolvedPrimaryFacultyId !== undefined) {
      await transaction.user.update({
        where: { id: targetId },
        data: { primaryFacultyId: resolvedPrimaryFacultyId },
      });
    }
  });
  await redisClient.revokeUserRefreshSessions(targetId);
  return prisma.user.findUniqueOrThrow({ where: { id: targetId }, select: targetSelect });
}
