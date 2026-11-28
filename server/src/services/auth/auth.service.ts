import bcrypt from "bcryptjs";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";

import { signAccessToken, signRefreshToken, verifyRefreshToken, type AppRole } from "@config/auth";
import { prisma } from "@config/prisma";
import { redisClient } from "@redis";
import { ApiError } from "@utils/ApiError";

export type LoginMode = "STUDENT" | "ADMIN";

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      isStudent: true,
      status: true,
      primaryFaculty: { select: { id: true, code: true, name: true } },
      student: {
        select: {
          id: true,
          userId: true,
          classId: true,
          studentCode: true,
          phone: true,
          address: true,
          dateOfBirth: true,
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
      userRoles: {
        select: {
          role: {
            select: {
              id: true,
              code: true,
              displayName: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: { id: true, permission: true, description: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!user) throw new ApiError(404, "User not found");
  if (user.status === "DISABLED") throw new ApiError(403, "Account is disabled");
  const permissions = [
    ...new Map(
      user.userRoles.flatMap(({ role }) =>
        role.rolePermissions.map(({ permission }) => [permission.id, permission] as const),
      ),
    ).values(),
  ];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isStudent: user.isStudent,
    roles: user.userRoles.map(({ role }) => ({
      id: role.id,
      code: role.code,
      displayName: role.displayName,
    })),
    permissions,
    effectiveFaculty: user.student?.class?.major.faculty ?? user.primaryFaculty,
    student: user.student,
  };
}

export async function updateCurrentStudentProfile(
  userId: string,
  input: {
    name: string;
    phone: string | null;
    address: string | null;
    dateOfBirth: Date | null;
  },
) {
  const student = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
  if (!student) throw new ApiError(409, "Student profile is required");
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { name: input.name } }),
    prisma.student.update({
      where: { id: student.id },
      data: {
        phone: input.phone,
        address: input.address,
        dateOfBirth: input.dateOfBirth,
      },
    }),
  ]);
  return getCurrentUser(userId);
}

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueTokenPair(userId: string, role: AppRole) {
  const identity = { sub: userId, role };
  const accessToken = signAccessToken(identity);
  const sessionId = randomUUID();
  const refreshToken = signRefreshToken(identity, sessionId);
  const decoded = jwt.decode(refreshToken) as { exp?: number } | null;
  if (!decoded?.exp) throw new ApiError(500, "Unable to create refresh token");

  const ttlSec = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);
  await redisClient.setRefreshSession(
    sessionId,
    { tokenHash: hashRefreshToken(refreshToken), role, userId },
    ttlSec,
  );
  return { accessToken, refreshToken, sessionId };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  if (!payload.jti) throw new ApiError(401, "Invalid refresh session");
  const session = await redisClient.getRefreshSession(payload.jti);
  if (!session) throw new ApiError(401, "Refresh token has been revoked");

  const receivedHash = Buffer.from(hashRefreshToken(refreshToken), "hex");
  const storedHash = Buffer.from(session.tokenHash, "hex");
  if (receivedHash.length !== storedHash.length || !timingSafeEqual(receivedHash, storedHash)) {
    throw new ApiError(401, "Refresh token has been revoked");
  }

  if (session.userId !== payload.sub) throw new ApiError(401, "Invalid refresh session");
  const currentRole = session.role as AppRole;
  const activeUser = await prisma.user.findFirst({
    where: {
      id: payload.sub,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!activeUser) {
    await redisClient.revokeRefreshSession(payload.jti);
    throw new ApiError(401, "Account is disabled or unavailable");
  }

  await redisClient.revokeRefreshSession(payload.jti);
  return issueTokenPair(payload.sub, currentRole);
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.jti) await redisClient.revokeRefreshSession(payload.jti);
  } catch {
    // Logout remains idempotent for expired or malformed cookies.
  }
}

export async function loginAdmin(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { userRoles: { include: { role: true } } },
  });
  if (!user?.password || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (user.status === "DISABLED") throw new ApiError(403, "Account is disabled");
  if (user.isStudent) throw new ApiError(403, "This login is only for staff");
  const sessionRole = user.userRoles[0]?.role.code ?? "STAFF";

  return {
    ...(await issueTokenPair(user.id, sessionRole)),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isStudent: user.isStudent,
      role: sessionRole,
    },
  };
}

export async function loginStudent(studentCode: string, password: string) {
  const normalizedCode = studentCode.trim().toUpperCase();
  const student = await prisma.student.findUnique({
    where: { studentCode: normalizedCode },
    include: {
      user: {
        include: { userRoles: { include: { role: true } } },
      },
    },
  });
  const user = student?.user;
  if (!user?.password || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, "Invalid student code or password");
  }
  if (user.status === "DISABLED") throw new ApiError(403, "Account is disabled");
  if (!user.isStudent) throw new ApiError(403, "This login is only for students");
  const sessionRole = user.userRoles[0]?.role.code ?? "STUDENT";

  return {
    ...(await issueTokenPair(user.id, sessionRole)),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isStudent: user.isStudent,
      role: sessionRole,
    },
  };
}

export async function switchAccessMode(userId: string, mode: LoginMode) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      isStudent: true,
      status: true,
      userRoles: { select: { role: { select: { code: true } } } },
    },
  });
  if (!user || user.status === "DISABLED") {
    throw new ApiError(403, "Account is disabled or unavailable");
  }

  if (mode === "ADMIN" && user.isStudent) {
    throw new ApiError(403, "Account does not have staff access");
  }
  if (mode === "STUDENT" && !user.isStudent) {
    throw new ApiError(403, "Account is not a student account");
  }
  const role = user.userRoles[0]?.role.code ?? (user.isStudent ? "STUDENT" : "STAFF");

  return {
    ...(await issueTokenPair(user.id, role)),
    user: { id: user.id, email: user.email, name: user.name, isStudent: user.isStudent, role },
  };
}
