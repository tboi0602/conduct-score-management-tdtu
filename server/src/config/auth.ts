import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { logger } from "@config/logger";
import { env } from "@config/env";

const SECRET = (() => {
  const secret = env.jwtSecret;
  if (!secret) {
    // Production bắt buộc có secret, không cho dùng default không an toàn.
    if (env.nodeEnv === "production") {
      throw new Error("[auth] JWT_SECRET is required in production");
    }
    logger.warn("[auth] JWT_SECRET not set - using insecure dev default");
    return "change_me_rs256_signing_secret";
  }
  return secret;
})();
const ACCESS_EXPIRES = env.jwtExpiresIn as NonNullable<
  import("jsonwebtoken").SignOptions["expiresIn"]
>;
const REFRESH_EXPIRES = env.jwtRefreshExpiresIn as NonNullable<
  import("jsonwebtoken").SignOptions["expiresIn"]
>;

export type AppRole = "ADMIN" | "STUDENT" | "EVENT_ORGANIZER" | "STUDENT_AFFAIRS";

export interface JwtPayload {
  sub: string;
  role: AppRole;
  tokenType: "access" | "refresh";
  iat?: number;
  exp?: number;
  jti?: string;
}

type TokenIdentity = Pick<JwtPayload, "sub" | "role">;

export function signAccessToken(payload: TokenIdentity): string {
  return jwt.sign({ ...payload, tokenType: "access" }, SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefreshToken(payload: TokenIdentity, sessionId: string): string {
  return jwt.sign({ ...payload, tokenType: "refresh" }, SECRET, {
    expiresIn: REFRESH_EXPIRES,
    jwtid: sessionId,
  });
}

function verifyTokenType(token: string, expected: JwtPayload["tokenType"]): JwtPayload {
  const payload = jwt.verify(token, SECRET) as JwtPayload;
  if (payload.tokenType !== expected) throw new Error(`Expected ${expected} token`);
  return payload;
}

export const verifyAccessToken = (token: string) => verifyTokenType(token, "access");
export const verifyRefreshToken = (token: string) => verifyTokenType(token, "refresh");

export function extractBearerToken(header?: string): string | null {
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice(7);
}
