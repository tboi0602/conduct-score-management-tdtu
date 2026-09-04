import type { Request, Response } from "express";

import {
  getCurrentUser,
  loginAdmin,
  loginWithGoogle,
  refreshAccessToken,
} from "@services/auth.service";
import type { AuthContext } from "@middleware/auth.middleware";
import { ApiError } from "@utils/ApiError";

export async function googleLogin(req: Request, res: Response): Promise<void> {
  const idToken = req.body?.idToken ?? req.body?.credential;
  if (typeof idToken !== "string" || idToken.trim().length === 0) {
    throw new ApiError(400, "Google ID token is required");
  }

  const result = await loginWithGoogle(idToken);
  res.status(200).json({ ok: true, data: result });
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
