import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";

import { prisma } from "@config/prisma";
import { redisClient } from "@redis";
import { getEventAccess } from "@services/events/event-access.service";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";

export type FacultyUserInput = {
  email: string;
  name: string;
  password?: string;
  roleName: "STUDENT" | "EVENT_ORGANIZER" | "STUDENT_AFFAIRS";
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
  userRoles: { select: { role: { select: { id: true, name: true } } } },
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
    student: { is: null },
    primaryFacultyId: facultyId,
    userRoles: { some: { role: { name: { notIn: ["STUDENT", "ADMIN"] } } } },
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
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
  if (input.roleName === "STUDENT") {
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

export async function createFacultyUser(actorId: string, input: FacultyUserInput) {
  const facultyId = await validateInput(actorId, input);
  const role = await prisma.role.findUniqueOrThrow({ where: { name: input.roleName } });
  const password = input.password ? await bcrypt.hash(input.password, 12) : null;
  const userId = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        password,
        primaryFacultyId: input.roleName !== "STUDENT" ? facultyId : null,
      },
    });
    await tx.userRole.create({ data: { userId: user.id, roleId: role.id } });
    if (input.roleName === "STUDENT")
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
    select: { id: true, student: { select: { id: true } } },
  });
  if (!current) throw new ApiError(404, "User not found in your faculty scope");
  const role = await prisma.role.findUniqueOrThrow({ where: { name: input.roleName } });
  const password = input.password ? await bcrypt.hash(input.password, 12) : undefined;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        email: input.email.trim().toLowerCase(),
        name: input.name.trim(),
        ...(password ? { password } : {}),
        primaryFacultyId: input.roleName !== "STUDENT" ? facultyId : null,
      },
    });
    await tx.userRole.deleteMany({ where: { userId: id } });
    await tx.userRole.create({ data: { userId: id, roleId: role.id } });
    if (input.roleName === "STUDENT")
      await tx.student.upsert({
        where: { userId: id },
        update: { studentCode: input.studentCode!.trim(), classId: input.classId },
        create: { userId: id, studentCode: input.studentCode!.trim(), classId: input.classId },
      });
    else if (current.student) await tx.student.delete({ where: { userId: id } });
  });
  await redisClient.revokeRefreshSession(id);
  return prisma.user.findUniqueOrThrow({ where: { id }, select });
}

export async function setFacultyStaffStatus(
  actorId: string,
  id: string,
  status: "ACTIVE" | "DISABLED",
) {
  const actor = await access(actorId);
  if (actor.manageAnyUnit)
    throw new ApiError(400, "Use the global user endpoint for administrators");
  const staff = await prisma.user.findFirst({
    where: {
      id,
      primaryFacultyId: actor.facultyId!,
      userRoles: { some: { role: { name: { in: ["EVENT_ORGANIZER", "STUDENT_AFFAIRS"] } } } },
    },
    select: { id: true },
  });
  if (!staff) throw new ApiError(404, "Staff member not found in your faculty scope");
  const updated = await prisma.user.update({ where: { id }, data: { status }, select });
  await redisClient.revokeRefreshSession(id);
  return updated;
}

export async function deleteFacultyStudent(actorId: string, id: string) {
  const actor = await access(actorId);
  if (actor.manageAnyUnit)
    throw new ApiError(400, "Use the global user endpoint for administrators");
  const student = await prisma.user.findFirst({
    where: {
      id,
      student: { is: { class: { is: { major: { is: { facultyId: actor.facultyId! } } } } } },
    },
    select: { id: true },
  });
  if (!student) throw new ApiError(404, "Student not found in your faculty scope");
  await prisma.user.delete({ where: { id } });
  await redisClient.revokeRefreshSession(id);
}
