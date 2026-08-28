const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ApiOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(parseApiError(detail, res.statusText));
  }
  return res.json() as Promise<T>;
}

function parseApiError(body: string, fallback: string): string {
  if (!body) return fallback;
  try {
    const json = JSON.parse(body) as { detail?: string | Array<{ msg?: string }> };
    if (typeof json.detail === "string") return json.detail;
    if (Array.isArray(json.detail)) {
      return json.detail.map((item) => item.msg).filter(Boolean).join(", ") || fallback;
    }
  } catch {
    /* plain-text error body */
  }
  return body;
}

export { fetchApiLiveness, fetchApiPulse, fetchApiReady } from "@/lib/api/pulse";

/** @deprecated Prefer useApiPulse() or fetchApiPulse() */
export { fetchApiLiveness as checkApiHealth } from "@/lib/api/pulse";
