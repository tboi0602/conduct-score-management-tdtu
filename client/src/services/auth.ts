import { authHttp, http } from "@/services/http";
import type { AuthUser } from "@/types/auth";

export type AuthSession = {
  accessToken: string;
  user: AuthUser;
};

export type LoginMode = "STUDENT" | "ADMIN";

type ApiResponse<T> = {
  ok: true;
  data: T;
};

export async function loginAdmin(email: string, password: string) {
  const response = await http<ApiResponse<AuthSession>>("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  return response.data;
}

export async function loginWithGoogle(credential: string, mode: LoginMode) {
  const response = await http<ApiResponse<AuthSession>>("/api/v1/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential, mode }),
  });

  return response.data;
}

export async function switchAccessMode(mode: LoginMode) {
  const response = await authHttp<ApiResponse<AuthSession>>("/api/v1/auth/switch-mode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });

  return response.data;
}

export async function logoutSession() {
  await http<void>("/api/v1/auth/logout", { method: "POST" });
}
