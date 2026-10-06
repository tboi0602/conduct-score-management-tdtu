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
  userRoles: { select: { role: { select: { id: true, name: true } } } },
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
    select: { userRoles: { select: { role: { select: { name: true } } } } },
  });
  if (!actor) throw new ApiError(401, "User not found");
  const isAdmin = actor.userRoles.some(({ role }) => role.name === "ADMIN");
  const where: Prisma.UserWhereInput = {
    id: { not: actorId },
    NOT: { userRoles: { some: { role: { name: "ADMIN" } } } },
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
      where: isAdmin
        ? { name: { not: "ADMIN" } }
        : { name: { in: ["STUDENT", "EVENT_ORGANIZER", "STUDENT_AFFAIRS"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.role.findMany({
      where: { name: { not: "ADMIN" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
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
  return { items, roles, filterRoles, faculties, pagination: createPaginationMeta(total, pagination) };
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
      select: { userRoles: { select: { role: { select: { name: true } } } } },
    }),
    prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        student: {
          select: { id: true, class: { select: { major: { select: { facultyId: true } } } } },
        },
        primaryFacultyId: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    }),
    prisma.role.findMany({ where: { id: { in: [...new Set(input.roleIds)] } } }),
  ]);
  if (!actor || !target) throw new ApiError(404, "User not found");
  if (target.userRoles.some(({ role }) => role.name === "ADMIN"))
    throw new ApiError(403, "Administrator accounts cannot be managed here");
  const isAdmin = actor.userRoles.some(({ role }) => role.name === "ADMIN");
  const targetFacultyId = target.student?.class?.major.facultyId ?? target.primaryFacultyId;
  if (!access.manageAnyUnit && (!access.facultyId || targetFacultyId !== access.facultyId))
    throw new ApiError(403, "User is outside your faculty scope");
  if (roles.length !== new Set(input.roleIds).size || roles.some((role) => role.name === "ADMIN"))
    throw new ApiError(403, "The selected role assignment is not allowed");
  if (!isAdmin && roles.some((role) => !["STUDENT", "EVENT_ORGANIZER", "STUDENT_AFFAIRS"].includes(role.name)))
    throw new ApiError(403, "You cannot assign the selected role");
  if (target.student && !roles.some((role) => role.name === "STUDENT"))
    throw new ApiError(400, "Student accounts must retain the STUDENT role");
  if (!target.student && roles.some((role) => role.name === "STUDENT"))
    throw new ApiError(400, "The STUDENT role can only be assigned to student accounts");
  if (target.student && roles.some((role) => role.name === "STUDENT_AFFAIRS"))
    throw new ApiError(400, "Student accounts cannot be assigned the STUDENT_AFFAIRS role");
  if (roles.some((role) => role.name === "STUDENT") && roles.some((role) => role.name === "STUDENT_AFFAIRS"))
    throw new ApiError(400, "STUDENT and STUDENT_AFFAIRS roles cannot be combined");
  if (roles.some((role) => role.name === "STUDENT_AFFAIRS") && roles.some((role) => role.name === "EVENT_ORGANIZER"))
    throw new ApiError(400, "STUDENT_AFFAIRS and EVENT_ORGANIZER roles cannot be combined");
  if (target.student && !roles.some((role) => role.name === "EVENT_ORGANIZER") && input.primaryFacultyId !== undefined)
    throw new ApiError(400, "Student academic faculty cannot be changed on this page");
  if (input.primaryFacultyId !== undefined && !isAdmin && !access.manageAnyUnit) {
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
    target.student && roles.some((role) => role.name === "EVENT_ORGANIZER")
      ? (input.primaryFacultyId ?? target.primaryFacultyId ?? target.student.class?.major.facultyId ?? null)
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
  await redisClient.revokeRefreshSession(targetId);
  return prisma.user.findUniqueOrThrow({ where: { id: targetId }, select: targetSelect });
}
