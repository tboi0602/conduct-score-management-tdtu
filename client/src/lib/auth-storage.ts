import type { AuthSession } from "@/services/auth";

const AUTH_SESSION_KEY = "auth.session";

export function saveAuthSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export function getAuthSession(): AuthSession | null {
  const value = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

export function updateAuthTokens(accessToken: string, refreshToken: string) {
  const session = getAuthSession();
  if (!session) return;
  saveAuthSession({ ...session, accessToken, refreshToken });
}
