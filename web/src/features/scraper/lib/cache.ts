type CacheEntry<T> = { value: T; expiresAt: number };

const CACHE = globalThis as unknown as {
  __scraperCache?: {
    manifest?: Map<string, CacheEntry<unknown>>;
    tmdb?: Map<string, CacheEntry<number | null>>;
    providerCode?: Map<string, CacheEntry<string>>;
  };
};

function now() {
  return Date.now();
}

function getCaches() {
  if (!CACHE.__scraperCache) CACHE.__scraperCache = {};
  const c = CACHE.__scraperCache;
  if (!c.manifest) c.manifest = new Map();
  if (!c.tmdb) c.tmdb = new Map();
  if (!c.providerCode) c.providerCode = new Map();
  return c as Required<NonNullable<typeof CACHE.__scraperCache>>;
}

export function clearScrapeCaches(opts?: { clearTmdb?: boolean }) {
  const c = getCaches();
  c.manifest.clear();
  c.providerCode.clear();
  if (opts?.clearTmdb) c.tmdb.clear();
}

export function cacheGet<T>(m: Map<string, CacheEntry<T>>, key: string): T | null {
  const ent = m.get(key);
  if (!ent) return null;
  if (ent.expiresAt <= now()) {
    m.delete(key);
    return null;
  }
  return ent.value;
}

export function cacheSet<T>(
  m: Map<string, CacheEntry<T>>,
  key: string,
  value: T,
  ttlMs: number,
) {
  m.set(key, { value, expiresAt: now() + ttlMs });
}

export function getManifestCache() {
  return getCaches().manifest;
}

export function getTmdbCache() {
  return getCaches().tmdb;
}

export function getProviderCodeCache() {
  return getCaches().providerCode;
}

export const CACHE_TTL_6H = 6 * 60 * 60_000;
