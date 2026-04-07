const defaultApiBase = "http://localhost:8080";

function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL?.trim();
  return base && base.length > 0 ? base.replace(/\/$/, "") : defaultApiBase;
}

export async function apiFetchJson<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { raw: text };
    }
  }
  if (!res.ok) {
    const err = new Error(`API ${res.status}`);
    (err as Error & { status?: number; body?: unknown }).status = res.status;
    (err as Error & { status?: number; body?: unknown }).body = body;
    throw err;
  }
  return body as T;
}
