import type { AuthSession } from "@/services/auth";
import type { AuthUser } from "@/types/auth";

const AUTH_USER_KEY = "auth.user";
let accessToken: string | null = null;

export function saveAuthSession(session: AuthSession) {
  accessToken = session.accessToken;
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
}

export function getAuthSession(): AuthSession | null {
  const value = window.localStorage.getItem(AUTH_USER_KEY);
  if (!value) return null;

  try {
    return { accessToken: accessToken ?? "", user: JSON.parse(value) as AuthUser };
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY);
    accessToken = null;
    return null;
  }
}

export function clearAuthSession() {
  accessToken = null;
  window.localStorage.removeItem(AUTH_USER_KEY);
  window.localStorage.removeItem("auth.session");
}

export function updateAccessToken(token: string) {
  accessToken = token;
}
