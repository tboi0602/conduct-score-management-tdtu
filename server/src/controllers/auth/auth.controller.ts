import type { Request, Response } from "express";

import {
  getCurrentUser,
  loginAdmin,
  loginWithGoogle,
  refreshAccessToken,
  revokeRefreshToken,
  switchAccessMode,
  updateCurrentStudentProfile,
} from "@services/auth/auth.service";
import type { AuthContext } from "@middleware/auth.middleware";
import { ApiError } from "@utils/ApiError";
import { env } from "@config/env";

const REFRESH_COOKIE = "refresh_token";
const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "lax" as const,
  path: "/api/v1/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function cookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const item of header.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return null;
}

function sendSession(
  res: Response,
  result: {
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    user: { id: string; email: string; name: string; role: string };
  },
): void {
  res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
  const { refreshToken: _refreshToken, sessionId: _sessionId, ...publicSession } = result;
  res.status(200).json({ ok: true, data: publicSession });
}

export async function googleLogin(req: Request, res: Response): Promise<void> {
  const idToken = req.body?.idToken ?? req.body?.credential;
  if (typeof idToken !== "string" || idToken.trim().length === 0) {
    throw new ApiError(400, "Google ID token is required");
  }

  const mode = req.body?.mode ?? "STUDENT";
  if (mode !== "STUDENT" && mode !== "ADMIN") {
    throw new ApiError(400, "mode must be STUDENT or ADMIN");
  }

  const result = await loginWithGoogle(idToken, mode);
  sendSession(res, result);
}

export async function switchMode(req: Request, res: Response): Promise<void> {
  const mode = req.body?.mode;
  if (mode !== "STUDENT" && mode !== "ADMIN") {
    throw new ApiError(400, "mode must be STUDENT or ADMIN");
  }
  const auth = res.locals.auth as AuthContext;
  sendSession(res, await switchAccessMode(auth.sub, mode));
}

export async function adminLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    throw new ApiError(400, "Email and password are required");
  }
  const result = await loginAdmin(email, password);
  sendSession(res, result);
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const token = cookie(req, REFRESH_COOKIE);
  if (!token) throw new ApiError(401, "Refresh session is required");
  const result = await refreshAccessToken(token);
  res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
  res.json({ ok: true, data: { accessToken: result.accessToken } });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = cookie(req, REFRESH_COOKIE);
  if (token) await revokeRefreshToken(token);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  res.status(204).end();
}

export async function me(_req: Request, res: Response): Promise<void> {
  const auth = res.locals.auth as AuthContext;
  res.json({ ok: true, data: await getCurrentUser(auth.sub) });
}

export async function updateMe(req: Request, res: Response): Promise<void> {
  const auth = res.locals.auth as AuthContext;
  const body = req.body as Record<string, unknown> | null;
  if (
    !body ||
    typeof body.name !== "string" ||
    !body.name.trim() ||
    body.name.trim().length > 100
  ) {
    throw new ApiError(400, "name must contain 1 to 100 characters");
  }
  const optionalText = (value: unknown, field: string, max: number) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "string" || value.trim().length > max)
      throw new ApiError(400, `${field} is invalid`);
    return value.trim();
  };
  const phone = optionalText(body.phone, "phone", 20);
  if (phone && !/^[+0-9 ()-]{7,20}$/.test(phone)) throw new ApiError(400, "phone is invalid");
  const address = optionalText(body.address, "address", 255);
  let dateOfBirth: Date | null = null;
  if (body.dateOfBirth !== null && body.dateOfBirth !== undefined && body.dateOfBirth !== "") {
    if (typeof body.dateOfBirth !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth))
      throw new ApiError(400, "dateOfBirth is invalid");
    dateOfBirth = new Date(`${body.dateOfBirth}T00:00:00.000Z`);
    if (!Number.isFinite(dateOfBirth.getTime()) || dateOfBirth > new Date())
      throw new ApiError(400, "dateOfBirth is invalid");
  }
  res.json({
    ok: true,
    data: await updateCurrentStudentProfile(auth.sub, {
      name: body.name.trim(),
      phone,
      address,
      dateOfBirth,
    }),
  });
}
