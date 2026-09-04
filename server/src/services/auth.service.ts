import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "crypto";
import jwt from "jsonwebtoken";

import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type AppRole,
} from "@config/auth";
import { prisma } from "@config/prisma";
import { redisClient } from "@redis";
import { ApiError } from "@utils/ApiError";

const googleClient = new OAuth2Client();

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      userRoles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
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
  const permissions = [
    ...new Map(
      user.userRoles.flatMap(({ role }) =>
        role.rolePermissions.map(
          ({ permission }) => [permission.id, permission] as const,
        ),
      ),
    ).values(),
  ];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.userRoles.map(({ role }) => ({ id: role.id, name: role.name })),
    permissions,
  };
}

function roleForEmail(email: string): Exclude<AppRole, "ADMIN"> | null {
  // Hiện tại lỗi phía GOOGLE CLIENT KHÔNG THỂ THÊM ĐƯỢC EMAIL TDTU, nên tạm thời bỏ qua việc kiểm tra domain email
  // const domain = email.toLowerCase().split("@")[1];
  // if (domain === "student.tdtu.edu.vn") return "STUDENT";
  // if (domain === "tdtu.edu.vn") return "LECTURER";
  return "STUDENT";
}

function studentCodeFromEmail(email: string): string {
  return email.slice(0, email.indexOf("@")).slice(0, 20);
}

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function issueTokenPair(userId: string, role: AppRole) {
  const identity = { sub: userId, role };
  const accessToken = signAccessToken(identity);
  const refreshToken = signRefreshToken(identity);
  const decoded = jwt.decode(refreshToken) as { exp?: number } | null;
  if (!decoded?.exp) throw new ApiError(500, "Unable to create refresh token");

  const ttlSec = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);
  await redisClient.setRefreshSession(
    userId,
    { tokenHash: hashRefreshToken(refreshToken), role },
    ttlSec,
  );
  return { accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const session = await redisClient.getRefreshSession(payload.sub);
  if (!session) throw new ApiError(401, "Refresh token has been revoked");

  const receivedHash = Buffer.from(hashRefreshToken(refreshToken), "hex");
  const storedHash = Buffer.from(session.tokenHash, "hex");
  if (
    receivedHash.length !== storedHash.length ||
    !timingSafeEqual(receivedHash, storedHash)
  ) {
    throw new ApiError(401, "Refresh token has been revoked");
  }

  const currentRole = session.role as AppRole;
  if (!["ADMIN", "STUDENT", "LECTURER"].includes(currentRole)) {
    await redisClient.revokeRefreshSession(payload.sub);
    throw new ApiError(401, "Invalid refresh session");
  }

  return issueTokenPair(payload.sub, currentRole);
}

export async function loginAdmin(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { userRoles: { include: { role: true } } },
  });
  if (!user?.password || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isAdmin = user.userRoles.some(({ role }) => role.name === "ADMIN");
  if (!isAdmin)
    throw new ApiError(403, "This login is only for administrators");

  return {
    ...(await issueTokenPair(user.id, "ADMIN")),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: "ADMIN" as const,
    },
  };
}

export async function loginWithGoogle(idToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new ApiError(500, "GOOGLE_CLIENT_ID is not configured");

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, "Invalid Google ID token");
  }

  if (!payload) throw new ApiError(401, "Invalid Google ID token payload");

  const email = payload.email?.trim().toLowerCase();
  const googleSubject = payload.sub;
  if (!email || !googleSubject || payload.email_verified !== true) {
    throw new ApiError(401, "Google account email must be verified");
  }

  const appRole = roleForEmail(email);
  if (!appRole) throw new ApiError(403, "Only TDTU email accounts are allowed");

  const role = await prisma.role.findUnique({ where: { name: appRole } });
  if (!role) {
    throw new ApiError(
      503,
      "Authorization roles are not initialized; run npm run seed",
    );
  }

  const name = (payload.name?.trim() || email).slice(0, 100);
  const user = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing?.googleSubject && existing.googleSubject !== googleSubject) {
      throw new ApiError(401, "Google account does not match this user");
    }

    const saved = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: { googleSubject, name },
        })
      : await tx.user.create({ data: { email, googleSubject, name } });

    await tx.userRole.upsert({
      where: { userId_roleId: { userId: saved.id, roleId: role.id } },
      update: {},
      create: { userId: saved.id, roleId: role.id },
    });

    if (appRole === "STUDENT") {
      await tx.student.upsert({
        where: { userId: saved.id },
        update: {},
        create: { userId: saved.id, studentCode: studentCodeFromEmail(email) },
      });
    }
    return saved;
  });

  return {
    ...(await issueTokenPair(user.id, appRole)),
    user: { id: user.id, email: user.email, name: user.name, role: appRole },
  };
}
