import { http } from "@/services/http";
import type { AuthUser } from "@/types/auth";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

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

export async function loginWithGoogle(credential: string) {
  const response = await http<ApiResponse<AuthSession>>("/api/v1/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });

  return response.data;
}
