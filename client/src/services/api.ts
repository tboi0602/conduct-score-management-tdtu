const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost/api";

interface RequestConfig {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function api<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const { method = "GET", body, headers = {} } = config;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export function apiGet<T>(path: string): Promise<T> {
  return api<T>(path);
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, { method: "POST", body });
}

export function apiPut<T>(path: string, body: unknown): Promise<T> {
  return api<T>(path, { method: "PUT", body });
}

export function apiDel(path: string): Promise<void> {
  return api<void>(path, { method: "DELETE" });
}