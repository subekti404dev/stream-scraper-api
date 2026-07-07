import { cacheGet, cacheSet, getProviderCodeCache, CACHE_TTL_6H } from "./cache";

export async function fetchTextWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok)
      throw new Error(`Failed to fetch (HTTP ${res.status}): ${url}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export async function getProviderCode(
  providerUrl: string,
  timeoutMs: number,
) {
  const providerCodeCache = getProviderCodeCache();
  const cached = cacheGet(providerCodeCache, providerUrl);
  if (cached) return cached;

  const code = await fetchTextWithTimeout(
    providerUrl,
    Math.min(15_000, timeoutMs),
  );
  cacheSet(providerCodeCache, providerUrl, code, CACHE_TTL_6H);
  return code;
}
