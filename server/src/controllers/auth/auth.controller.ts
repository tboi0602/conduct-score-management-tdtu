import type { Request, Response } from "express";

import {
  getCurrentUser,
  loginAdmin,
  loginWithGoogle,
  refreshAccessToken,
  switchAccessMode,
  updateCurrentStudentProfile,
} from "@services/auth/auth.service";
import type { AuthContext } from "@middleware/auth.middleware";
import { ApiError } from "@utils/ApiError";

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
  res.status(200).json({ ok: true, data: result });
}

export async function switchMode(req: Request, res: Response): Promise<void> {
  const mode = req.body?.mode;
  if (mode !== "STUDENT" && mode !== "ADMIN") {
    throw new ApiError(400, "mode must be STUDENT or ADMIN");
  }
  const auth = res.locals.auth as AuthContext;
  res.json({ ok: true, data: await switchAccessMode(auth.sub, mode) });
}

export async function adminLogin(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    throw new ApiError(400, "Email and password are required");
  }
  const result = await loginAdmin(email, password);
  res.status(200).json({ ok: true, data: result });
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  if (typeof req.body?.refreshToken !== "string" || !req.body.refreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }
  const result = await refreshAccessToken(req.body.refreshToken);
  res.status(200).json({ ok: true, data: result });
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
