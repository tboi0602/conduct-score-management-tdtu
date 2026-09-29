import { env } from "@/lib/env";
import { clearAuthSession, getAuthSession, updateAccessToken } from "@/lib/auth-storage";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "REQUEST_FAILED",
    public readonly fields?: Record<string, string[]>,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${env.apiBaseUrl}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new HttpError(401, "Session expired");
        const body = (await response.json()) as { data: { accessToken: string } };
        updateAccessToken(body.data.accessToken);
        return body.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string | { code?: string; message?: string; fields?: Record<string, string[]> };
      message?: string;
      requestId?: string;
    } | null;
    const structured = body?.error && typeof body.error === "object" ? body.error : null;
    const message =
      structured?.message ??
      (typeof body?.error === "string" ? body.error : body?.message) ??
      `HTTP ${response.status}`;
    throw new HttpError(
      response.status,
      message,
      structured?.code,
      structured?.fields,
      body?.requestId ?? response.headers.get("x-request-id") ?? undefined,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, { ...init, credentials: "include" });

  return parseResponse<T>(response);
}

export async function authHttp<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getAuthSession();
  if (!session) throw new HttpError(401, "Authentication required");

  const request = (accessToken: string) =>
    fetch(`${env.apiBaseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
    });

  let response = session.accessToken
    ? await request(session.accessToken)
    : new Response(null, { status: 401 });
  if (response.status !== 401) return parseResponse<T>(response);

  let refreshedToken: string;
  try {
    refreshedToken = await refreshAccessToken();
  } catch {
    clearAuthSession();
    throw new HttpError(401, "Session expired");
  }
  response = await request(refreshedToken);
  return parseResponse<T>(response);
}
