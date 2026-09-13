import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";

import { prisma } from "@config/prisma";
import { redisClient } from "@redis";
import { ApiError } from "@utils/ApiError";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";

export type UserInput = {
  email: string;
  name: string;
  password?: string | null;
  roleIds: string[];
  studentCode?: string | null;
  classId?: string | null;
  primaryFacultyId?: string | null;
};

export type UserFilters = {
  search?: string;
  facultyId?: string;
  majorId?: string;
  classId?: string;
  roleId?: string;
};

const publicUserSelect = {
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
} as const;

export async function listUsers(params: PaginationParams, filters: UserFilters = {}) {
  const search = filters.search?.trim();
  const where: Prisma.UserWhereInput = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            {
              student: {
                is: { studentCode: { contains: search, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
    ...(filters.roleId ? { userRoles: { some: { roleId: filters.roleId } } } : {}),
    ...(filters.classId
      ? { student: { is: { classId: filters.classId } } }
      : filters.majorId
        ? { student: { is: { class: { is: { majorId: filters.majorId } } } } }
        : filters.facultyId
          ? {
              student: {
                is: {
                  class: {
                    is: { major: { is: { facultyId: filters.facultyId } } },
                  },
                },
              },
            }
          : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: publicUserSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: params.skip,
      take: params.limit,
    }),
  ]);

  return { items, pagination: createPaginationMeta(total, params) };
}

export async function findUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: publicUserSelect,
  });
  if (!user) throw new ApiError(404, "User not found");
  return user;
}

async function getRoles(roleIds: string[]) {
  const uniqueIds = [...new Set(roleIds)];
  const roles = await prisma.role.findMany({
    where: { id: { in: uniqueIds } },
  });
  if (roles.length !== uniqueIds.length) throw new ApiError(400, "One or more roles do not exist");
  return roles;
}

function normalizeInput(input: UserInput) {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!email) throw new ApiError(400, "Email is required");
  if (!name) throw new ApiError(400, "Name is required");
  if (input.password !== undefined && input.password !== null && input.password.length < 6) {
    throw new ApiError(400, "Password must contain at least 6 characters");
  }
  return { email, name };
}

export async function createUser(input: UserInput) {
  const { email, name } = normalizeInput(input);
  const roles = await getRoles(input.roleIds);
  const isStudent = roles.some((role) => role.name === "STUDENT");
  const studentCode = input.studentCode?.trim();
  if (isStudent && !studentCode)
    throw new ApiError(400, "studentCode is required for STUDENT role");
  const password = input.password ? await bcrypt.hash(input.password, 12) : null;
  if (!isStudent && input.primaryFacultyId) {
    const faculty = await prisma.faculty.findUnique({
      where: { id: input.primaryFacultyId },
      select: { id: true },
    });
    if (!faculty) throw new ApiError(400, "Primary faculty does not exist");
  }

  try {
    const userId = await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email,
          name,
          password,
          primaryFacultyId: isStudent ? null : (input.primaryFacultyId ?? null),
        },
      });
      if (roles.length) {
        await transaction.userRole.createMany({
          data: roles.map((role) => ({ userId: user.id, roleId: role.id })),
        });
      }
      if (isStudent && studentCode) {
        await transaction.student.create({
          data: {
            userId: user.id,
            studentCode,
            classId: input.classId ?? null,
          },
        });
      }
      return user.id;
    });
    return findUserById(userId);
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function updateUser(id: string, input: UserInput) {
  const current = await prisma.user.findUnique({
    where: { id },
    include: { student: true },
  });
  if (!current) throw new ApiError(404, "User not found");

  const { email, name } = normalizeInput(input);
  const roles = await getRoles(input.roleIds);
  const isStudent = roles.some((role) => role.name === "STUDENT");
  const isAdmin = roles.some((role) => role.name === "ADMIN");
  if (current.email === "admin" && (email !== "admin" || !isAdmin)) {
    throw new ApiError(400, "The default admin account must keep its email and ADMIN role");
  }

  const studentCode = input.studentCode?.trim() || current.student?.studentCode;
  if (isStudent && !studentCode)
    throw new ApiError(400, "studentCode is required for STUDENT role");
  const password = input.password ? await bcrypt.hash(input.password, 12) : undefined;
  if (!isStudent && input.primaryFacultyId) {
    const faculty = await prisma.faculty.findUnique({
      where: { id: input.primaryFacultyId },
      select: { id: true },
    });
    if (!faculty) throw new ApiError(400, "Primary faculty does not exist");
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id },
        data: {
          email,
          name,
          primaryFacultyId: isStudent ? null : (input.primaryFacultyId ?? null),
          ...(password ? { password } : {}),
        },
      });
      await transaction.userRole.deleteMany({ where: { userId: id } });
      if (roles.length) {
        await transaction.userRole.createMany({
          data: roles.map((role) => ({ userId: id, roleId: role.id })),
        });
      }

      if (isStudent && studentCode) {
        await transaction.student.upsert({
          where: { userId: id },
          update: {
            studentCode,
            classId: input.classId ?? current.student?.classId ?? null,
          },
          create: { userId: id, studentCode, classId: input.classId ?? null },
        });
      }
    });
    await redisClient.revokeRefreshSession(id);
    return findUserById(id);
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function deleteUser(actorUserId: string, id: string) {
  if (actorUserId === id) {
    throw new ApiError(409, "You cannot delete your own account");
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, "User not found");
  if (user.email === "admin")
    throw new ApiError(400, "The default admin account cannot be deleted");
  await prisma.user.delete({ where: { id } });
  await redisClient.revokeRefreshSession(id);
}

function mapPrismaError(error: unknown): Error {
  const code = (error as { code?: string }).code;
  if (code === "P2002") return new ApiError(409, "Email or student code already exists");
  if (code === "P2003") return new ApiError(400, "Referenced class does not exist");
  if (code === "P2025") return new ApiError(404, "User or related resource not found");
  return error instanceof Error ? error : new Error("Unknown database error");
}
