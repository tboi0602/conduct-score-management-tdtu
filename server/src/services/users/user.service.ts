import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";

import { prisma } from "@config/prisma";
import { redisClient } from "@redis";
import { ApiError } from "@utils/ApiError";
import { runBulkAction } from "@utils/bulkAction";
import { createPaginationMeta, type PaginationParams } from "@utils/pagination";
import { deleteStudentAccount } from "@services/users/student-account-deletion.service";

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
  userType?: "STUDENT" | "STAFF";
};

const STAFF_ROLE_NAME_LIST = ["EVENT_ORGANIZER", "STUDENT_AFFAIRS"] as const;
const STAFF_ROLE_NAMES = new Set<string>(STAFF_ROLE_NAME_LIST);
const STAFF_EMAIL_PATTERN = /^[^@\s]+@tdtu\.edu\.vn$/i;

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
    ...(filters.userType === "STUDENT"
      ? {
          student: { isNot: null },
          userRoles: { some: { role: { name: "STUDENT" } } },
        }
      : filters.userType === "STAFF"
        ? {
            userRoles: { some: { role: { name: { in: [...STAFF_ROLE_NAME_LIST] } } } },
            NOT: { userRoles: { some: { role: { name: "ADMIN" } } } },
          }
        : {}),
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
  if (email.length > 150) throw new ApiError(400, "Email must not exceed 150 characters");
  if (!name) throw new ApiError(400, "Name is required");
  if (name.length > 100) throw new ApiError(400, "Name must not exceed 100 characters");
  if (input.password !== undefined && input.password !== null && input.password.length < 6) {
    throw new ApiError(400, "Password must contain at least 6 characters");
  }
  return { email, name };
}

function validateStaffInput(
  input: UserInput,
  email: string,
  roles: Array<{ name: string }>,
  requirePassword: boolean,
) {
  const isStudent = roles.some((role) => role.name === "STUDENT");
  const staffRoles = roles.filter((role) => STAFF_ROLE_NAMES.has(role.name));
  if (isStudent || staffRoles.length === 0) return;

  if (roles.length !== 1 || staffRoles.length !== 1) {
    throw new ApiError(
      400,
      "Staff accounts must have exactly one supported staff role",
      "STAFF_ROLE_INVALID",
      { roleIds: ["Select either EVENT_ORGANIZER or STUDENT_AFFAIRS"] },
    );
  }
  if (!STAFF_EMAIL_PATTERN.test(email)) {
    throw new ApiError(400, "Staff email must use the @tdtu.edu.vn domain", "STAFF_EMAIL_INVALID", {
      email: ["Staff email must use the @tdtu.edu.vn domain"],
    });
  }
  if (requirePassword && !input.password) {
    throw new ApiError(400, "Password is required for staff accounts", "STAFF_PASSWORD_REQUIRED", {
      password: ["Password is required for staff accounts"],
    });
  }
  if (!input.primaryFacultyId?.trim()) {
    throw new ApiError(
      400,
      "Primary faculty is required for staff accounts",
      "STAFF_FACULTY_REQUIRED",
      { primaryFacultyId: ["Select a primary faculty"] },
    );
  }
}

export async function createUser(input: UserInput) {
  const { email, name } = normalizeInput(input);
  const roles = await getRoles(input.roleIds);
  const isStudent = roles.some((role) => role.name === "STUDENT");
  validateStaffInput(input, email, roles, true);
  const studentCode = input.studentCode?.trim();
  if (isStudent && !studentCode)
    throw new ApiError(400, "studentCode is required for STUDENT role");
  const password = input.password ? await bcrypt.hash(input.password, 12) : null;
  if (!isStudent && input.primaryFacultyId) {
    const faculty = await prisma.faculty.findUnique({
      where: { id: input.primaryFacultyId },
      select: { id: true },
    });
    if (!faculty)
      throw new ApiError(400, "Primary faculty does not exist", "STAFF_FACULTY_NOT_FOUND", {
        primaryFacultyId: ["Primary faculty does not exist"],
      });
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
  let roles = await getRoles(input.roleIds);
  const keepsStudentOrganizerRole =
    Boolean(current.student) && roles.some((role) => role.name === "EVENT_ORGANIZER");
  if (keepsStudentOrganizerRole && !roles.some((role) => role.name === "STUDENT")) {
    const studentRole = await prisma.role.findUnique({ where: { name: "STUDENT" } });
    if (!studentRole) throw new ApiError(500, "STUDENT role does not exist");
    roles = [...roles, studentRole];
  }
  if (current.student && roles.some((role) => role.name === "STUDENT_AFFAIRS")) {
    throw new ApiError(400, "Student accounts cannot be assigned the STUDENT_AFFAIRS role");
  }
  const isStudent = roles.some((role) => role.name === "STUDENT");
  validateStaffInput(input, email, roles, false);
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
    if (!faculty)
      throw new ApiError(400, "Primary faculty does not exist", "STAFF_FACULTY_NOT_FOUND", {
        primaryFacultyId: ["Primary faculty does not exist"],
      });
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id },
        data: {
          email,
          name,
          primaryFacultyId: isStudent
            ? keepsStudentOrganizerRole
              ? current.primaryFacultyId
              : null
            : (input.primaryFacultyId ?? null),
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
    await redisClient.revokeUserRefreshSessions(id);
    return findUserById(id);
  } catch (error) {
    throw mapPrismaError(error);
  }
}

export async function deleteUser(actorUserId: string, id: string) {
  if (actorUserId === id) {
    throw new ApiError(409, "You cannot delete your own account");
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true, student: { select: { id: true } } },
  });
  if (!user) throw new ApiError(404, "User not found");
  if (user.email === "admin")
    throw new ApiError(400, "The default admin account cannot be deleted");
  if (user.student) {
    await deleteStudentAccount({ actorUserId, targetUserId: id });
    return;
  }
  await prisma.user.delete({ where: { id } });
  await redisClient.revokeUserRefreshSessions(id);
}

export async function deleteStudents(actorUserId: string, ids: string[]) {
  return runBulkAction(ids, async (id) => {
    await deleteStudentAccount({ actorUserId, targetUserId: id });
  });
}

export async function setStaffStatus(
  actorUserId: string,
  id: string,
  status: "ACTIVE" | "DISABLED",
) {
  if (actorUserId === id) throw new ApiError(409, "You cannot change your own status");
  const staff = await prisma.user.findFirst({
    where: {
      id,
      userRoles: { some: { role: { name: { in: [...STAFF_ROLE_NAME_LIST] } } } },
      NOT: { userRoles: { some: { role: { name: "ADMIN" } } } },
    },
    select: { id: true },
  });
  if (!staff) throw new ApiError(404, "Staff member not found");
  const updated = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.update({
      where: { id },
      data: { status },
      select: publicUserSelect,
    });
    if (status === "DISABLED") {
      const resolvedAt = new Date();
      await transaction.conductScoreWarning.updateMany({
        where: { student: { userId: id }, status: "ACTIVE" },
        data: { status: "RESOLVED", resolvedAt },
      });
    }
    return user;
  });
  await redisClient.revokeUserRefreshSessions(id);
  return updated;
}

export async function setStaffStatuses(
  actorUserId: string,
  ids: string[],
  status: "ACTIVE" | "DISABLED",
) {
  return runBulkAction(ids, async (id) => {
    await setStaffStatus(actorUserId, id, status);
  });
}

function mapPrismaError(error: unknown): Error {
  const code = (error as { code?: string }).code;
  if (code === "P2002")
    return new ApiError(409, "Email or student code already exists", "USER_ALREADY_EXISTS");
  if (code === "P2003") return new ApiError(400, "Referenced class does not exist");
  if (code === "P2025") return new ApiError(404, "User or related resource not found");
  return error instanceof Error ? error : new Error("Unknown database error");
}
