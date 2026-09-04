import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { logger } from "@config/logger";

const SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Production bắt buộc có secret, không cho dùng default không an toàn.
    if (process.env.NODE_ENV === "production") {
      throw new Error("[auth] JWT_SECRET is required in production");
    }
    logger.warn("[auth] JWT_SECRET not set - using insecure dev default");
    return "change_me_rs256_signing_secret";
  }
  return secret;
})();
const ACCESS_EXPIRES = (process.env.JWT_EXPIRES_IN ?? "15m") as NonNullable<
  import("jsonwebtoken").SignOptions["expiresIn"]
>;
const REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES_IN ?? "30d") as NonNullable<
  import("jsonwebtoken").SignOptions["expiresIn"]
>;

export type AppRole = "ADMIN" | "STUDENT" | "LECTURER";

export interface JwtPayload {
  sub: string;
  role: AppRole;
  tokenType: "access" | "refresh";
  iat?: number;
  exp?: number;
}

type TokenIdentity = Pick<JwtPayload, "sub" | "role">;

export function signAccessToken(payload: TokenIdentity): string {
  return jwt.sign({ ...payload, tokenType: "access" }, SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefreshToken(payload: TokenIdentity): string {
  return jwt.sign(
    { ...payload, tokenType: "refresh" },
    SECRET,
    { expiresIn: REFRESH_EXPIRES, jwtid: randomUUID() },
  );
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
