import { env } from "@/lib/env";
import { clearAuthSession, getAuthSession, updateAuthTokens } from "@/lib/auth-storage";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new HttpError(response.status, body?.error ?? `HTTP ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, init);

  return parseResponse<T>(response);
}

export async function authHttp<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getAuthSession();
  if (!session) throw new HttpError(401, "Authentication required");

  const request = (accessToken: string) =>
    fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
    });

  let response = await request(session.accessToken);
  if (response.status !== 401) return parseResponse<T>(response);

  const refreshResponse = await fetch(`${env.apiBaseUrl}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });

  if (!refreshResponse.ok) {
    clearAuthSession();
    throw new HttpError(401, "Session expired");
  }

  const refreshed = (await refreshResponse.json()) as {
    data: { accessToken: string; refreshToken: string };
  };
  updateAuthTokens(refreshed.data.accessToken, refreshed.data.refreshToken);
  response = await request(refreshed.data.accessToken);
  return parseResponse<T>(response);
}
