export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status = 502,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export async function fetchJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 12000, ...rest } = init;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AeroDeck/1.0 (flight-simulation education; +https://localhost)",
        ...rest.headers,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new ProviderError(`Upstream returned HTTP ${res.status}`, "upstream_error", res.status, body.slice(0, 500));
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if ((error as Error).name === "AbortError") {
      throw new ProviderError("Upstream request timed out", "timeout", 504);
    }
    throw new ProviderError("Upstream could not be reached", "network", 503, String(error));
  } finally {
    clearTimeout(t);
  }
}

export async function fetchText(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<{ status: number; body: string }> {
  const { timeoutMs = 12000, ...rest } = init;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        "User-Agent": "AeroDeck/1.0 (flight-simulation education)",
        ...rest.headers,
      },
      cache: "no-store",
    });
    const body = await res.text();
    return { status: res.status, body };
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new ProviderError("Upstream request timed out", "timeout", 504);
    }
    throw new ProviderError("Upstream could not be reached", "network", 503, String(error));
  } finally {
    clearTimeout(t);
  }
}

export function jsonError(message: string, status = 400, code = "error") {
  return Response.json({ error: message, code }, { status });
}
