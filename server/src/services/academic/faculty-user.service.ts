import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";

import { prisma } from "@config/prisma";
import { redisClient } from "@redis";
import { getEventAccess } from "@services/events/event-access.service";
import { deleteStudentAccount } from "@services/users/student-account-deletion.service";
import { ApiError } from "@utils/ApiError";
import { runBulkAction } from "@utils/bulkAction";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";

export type FacultyUserInput = {
  email: string;
  name: string;
  password?: string;
  roleIds: string[];
  studentCode?: string | null;
  classId?: string | null;
};

const select = {
  id: true,
  email: true,
  name: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  primaryFacultyId: true,
  primaryFaculty: { select: { id: true, code: true, name: true } },
  userRoles: { select: { role: { select: { id: true, code: true, displayName: true } } } },
  student: {
    select: {
      id: true,
      studentCode: true,
      classId: true,
      class: {
        select: {
          id: true,
          code: true,
          name: true,
          major: {
            select: {
              id: true,
              code: true,
              name: true,
              faculty: { select: { id: true, code: true, name: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

async function access(userId: string) {
  const value = await getEventAccess(userId);
  if (!value.manageAnyUnit && !value.facultyId)
    throw new ApiError(409, "A primary faculty must be assigned");
  return value;
}

const scopedWhere = (facultyId: string, userType?: "STUDENT" | "STAFF"): Prisma.UserWhereInput => {
  const studentScope: Prisma.UserWhereInput = {
    student: { is: { class: { is: { major: { is: { facultyId } } } } } },
  };
  const staffScope: Prisma.UserWhereInput = {
    AND: [
      { email: { not: "admin" } },
      {
        NOT: {
          userRoles: {
            some: { role: { rolePermissions: { some: { permission: { permission: "*" } } } } },
          },
        },
      },
      {
        OR: [
          { student: { is: null }, primaryFacultyId: facultyId },
          {
            userRoles: {
              some: {
                role: {
                  rolePermissions: {
                    some: {
                      permission: {
                        permission: {
                          in: [
                            "event.create",
                            "event.update",
                            "event.delete",
                            "faculty-staff.read",
                            "faculty-staff.create",
                            "faculty-staff.update",
                            "faculty-staff.disable",
                            "faculty-staff.create-student",
                            "user.assign-role",
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
            OR: [
              { primaryFacultyId: facultyId },
              { student: { is: { class: { major: { facultyId } } } } },
            ],
          },
        ],
      },
    ],
  };
  if (userType === "STUDENT") return studentScope;
  if (userType === "STAFF") return staffScope;
  return { OR: [studentScope, staffScope] };
};

export async function listFacultyUsers(
  actorId: string,
  params: PaginationParams,
  search?: string,
  userType?: "STUDENT" | "STAFF",
) {
  const actor = await access(actorId);
  if (actor.manageAnyUnit)
    throw new ApiError(400, "Use the global user endpoint for administrators");
  const where: Prisma.UserWhereInput = {
    AND: [
      scopedWhere(actor.facultyId!, userType),
      ...(search
        ? [
            {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
                {
                  student: {
                    is: { studentCode: { contains: search, mode: "insensitive" as const } },
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };
  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);
  return { items, pagination: createPaginationMeta(total, params) };
}

async function validateInput(actorId: string, input: FacultyUserInput) {
  const actor = await access(actorId);
  if (actor.manageAnyUnit)
    throw new ApiError(400, "Use the global user endpoint for administrators");
  if (!input.email.trim() || !input.name.trim())
    throw new ApiError(400, "Email and name are required");
  if (input.password && input.password.length < 6)
    throw new ApiError(400, "Password must contain at least 6 characters");
  const isStudent = Boolean(input.studentCode?.trim());
  if (isStudent) {
    if (!input.studentCode?.trim() || !input.classId)
      throw new ApiError(400, "Student code and class are required");
    const classInScope = await prisma.class.findFirst({
      where: { id: input.classId, major: { is: { facultyId: actor.facultyId! } } },
      select: { id: true },
    });
    if (!classInScope) throw new ApiError(403, "Class is outside your faculty scope");
  }
  return actor.facultyId!;
}

async function assertCanAssignWildcardRoles(actorId: string, roleIds: string[]): Promise<void> {
  if (!roleIds.length) return;
  const wildcardRole = await prisma.role.findFirst({
    where: {
      id: { in: roleIds },
      rolePermissions: { some: { permission: { permission: "*" } } },
    },
    select: { id: true },
  });
  if (!wildcardRole) return;
  const actorHasWildcard = await prisma.userRole.findFirst({
    where: {
      userId: actorId,
      user: { status: "ACTIVE" },
      role: { rolePermissions: { some: { permission: { permission: "*" } } } },
    },
    select: { userId: true },
  });
  if (!actorHasWildcard) {
    throw new ApiError(403, "Cannot assign a role with wildcard (*) permission");
  }
}

export async function createFacultyUser(actorId: string, input: FacultyUserInput) {
  const facultyId = await validateInput(actorId, input);
  const isStudent = Boolean(input.studentCode?.trim());
  const roleIds = [...new Set(input.roleIds)];
  await assertCanAssignWildcardRoles(actorId, roleIds);
  const password = await bcrypt.hash(input.password?.trim() || "123456", 12);
  const userId = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        password,
        isStudent,
        primaryFacultyId: isStudent ? null : facultyId,
      },
    });
    if (roleIds.length) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
      });
    }
    if (isStudent)
      await tx.student.create({
        data: { userId: user.id, studentCode: input.studentCode!.trim(), classId: input.classId },
      });
    return user.id;
  });
  return prisma.user.findUniqueOrThrow({ where: { id: userId }, select });
}

export async function updateFacultyUser(actorId: string, id: string, input: FacultyUserInput) {
  const facultyId = await validateInput(actorId, input);
  const current = await prisma.user.findFirst({
    where: { id, ...scopedWhere(facultyId) },
    select: {
      id: true,
      status: true,
      isStudent: true,
      student: { select: { id: true } },
      userRoles: { select: { roleId: true } },
    },
  });
  if (!current) throw new ApiError(404, "User not found in your faculty scope");
  if (current.status === "DISABLED") throw new ApiError(400, "Disabled accounts cannot be edited");
  const isStudent = current.isStudent || Boolean(input.studentCode?.trim());
  const roleIds = [...new Set(input.roleIds)];
  if (actorId === id) {
    const currentRoleIds = new Set(current.userRoles.map((ur) => ur.roleId));
    const nextRoleIds = new Set(roleIds);
    const sameRoles =
      currentRoleIds.size === nextRoleIds.size &&
      [...currentRoleIds].every((roleId) => nextRoleIds.has(roleId));
    if (!sameRoles) {
      throw new ApiError(403, "Cannot assign roles to yourself");
    }
  }
  await assertCanAssignWildcardRoles(actorId, roleIds);
  const password = input.password ? await bcrypt.hash(input.password, 12) : undefined;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        ...(password ? { password } : {}),
        primaryFacultyId: isStudent ? null : facultyId,
      },
    });
    await tx.userRole.deleteMany({ where: { userId: id } });
    if (roleIds.length) {
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
      });
    }
    if (isStudent)
      await tx.student.upsert({
        where: { userId: id },
        update: { studentCode: input.studentCode!.trim(), classId: input.classId },
        create: { userId: id, studentCode: input.studentCode!.trim(), classId: input.classId },
      });
    else if (current.student) await tx.student.delete({ where: { userId: id } });
  });
  await redisClient.revokeUserRefreshSessions(id);
  return prisma.user.findUniqueOrThrow({ where: { id }, select });
}

export async function setFacultyStaffStatus(
  actorId: string,
  id: string,
  status: "ACTIVE" | "DISABLED",
) {
  if (status === "ACTIVE") throw new ApiError(400, "Disabled accounts cannot be reactivated");
  if (actorId === id) throw new ApiError(409, "You cannot change your own status");
  const actor = await access(actorId);
  if (actor.manageAnyUnit)
    throw new ApiError(400, "Use the global user endpoint for administrators");
  const staff = await prisma.user.findFirst({
    where: {
      id,
      ...scopedWhere(actor.facultyId!, "STAFF"),
    },
    select: { id: true },
  });
  if (!staff) throw new ApiError(404, "Staff member not found in your faculty scope");
  const updated = await prisma.user.update({ where: { id }, data: { status }, select });
  await redisClient.revokeUserRefreshSessions(id);
  return updated;
}

export async function setFacultyStaffStatuses(
  actorId: string,
  ids: string[],
  status: "ACTIVE" | "DISABLED",
) {
  return runBulkAction(ids, async (id) => {
    await setFacultyStaffStatus(actorId, id, status);
  });
}

export async function deleteFacultyStudent(actorId: string, id: string) {
  const actor = await access(actorId);
  if (actor.manageAnyUnit)
    throw new ApiError(400, "Use the global user endpoint for administrators");
  await deleteStudentAccount({
    actorUserId: actorId,
    targetUserId: id,
    facultyScopeId: actor.facultyId!,
  });
}

export async function deleteFacultyStudents(actorId: string, ids: string[]) {
  return runBulkAction(ids, (id) => deleteFacultyStudent(actorId, id));
}
