type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const hit = store.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expires) {
    store.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): T {
  store.set(key, { value, expires: Date.now() + ttlMs });
  return value;
}

export async function cacheGetOrSet<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const existing = cacheGet<T>(key);
  if (existing !== undefined) return existing;
  const value = await fn();
  return cacheSet(key, value, ttlMs);
}
