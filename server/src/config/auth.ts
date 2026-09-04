import jwt from "jsonwebtoken";
import { logger } from "./logger";

const SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[auth] JWT_SECRET is required in production");
    }
    logger.warn("[auth] JWT_SECRET not set - using insecure dev default");
    return "change_me_rs256_signing_secret";
  }
  return secret;
})();
const ACCESS_EXPIRES = (process.env.JWT_EXPIRES_IN ?? "8h") as NonNullable<
  import("jsonwebtoken").SignOptions["expiresIn"]
>;
const REFRESH_EXPIRES = "30d";

export interface JwtPayload {
  sub: string;      // user/admin id
  role: "admin" | "counselor";
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function signRefreshToken(payload: Pick<JwtPayload, "sub" | "role">): string {
  return jwt.sign(payload, SECRET, { expiresIn: REFRESH_EXPIRES });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function extractBearerToken(header?: string): string | null {
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice(7);
}