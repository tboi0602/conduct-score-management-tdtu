import type { NextFunction, Request, Response } from "express";

import { extractBearerToken, verifyAccessToken, type JwtPayload } from "@config/auth";
import { prisma } from "@config/prisma";
import { ApiError } from "@utils/ApiError";

export type AuthContext = Pick<JwtPayload, "sub" | "role">;

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) return next(new ApiError(401, "Authentication required"));

  try {
    const payload = verifyAccessToken(token);
    res.locals.auth = { sub: payload.sub, role: payload.role } satisfies AuthContext;
    next();
  } catch {
    next(new ApiError(401, "Invalid or expired access token"));
  }
}

export function requirePermission(permission: string) {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const auth = res.locals.auth as AuthContext | undefined;
      if (!auth) return next(new ApiError(401, "Authentication required"));

      const matched = await prisma.userRole.findFirst({
        where: {
          userId: auth.sub,
          user: { status: "ACTIVE" },
          role: {
            rolePermissions: {
              some: { permission: { permission: { in: [permission, "*"] } } },
            },
          },
        },
        select: { userId: true },
      });
      if (!matched) return next(new ApiError(403, `Missing permission: ${permission}`));
      next();
    } catch (error) {
      next(error);
    }
  };
}
