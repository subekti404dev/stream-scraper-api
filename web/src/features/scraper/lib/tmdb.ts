import { cacheGet, cacheSet, getTmdbCache, CACHE_TTL_6H } from "./cache";

export async function resolveImdbToTmdb(
  imdb_id: string,
  type: "movie" | "tv",
): Promise<number | null> {
  const tmdbCache = getTmdbCache();
  const key = `${type}:${imdb_id}`;
  const cached = cacheGet(tmdbCache, key);
  if (cached !== null) return cached as number;

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TMDB_API_KEY is not set on server (required for server-side scraping).",
    );
  }
  const url = `https://api.themoviedb.org/3/find/${encodeURIComponent(
    imdb_id,
  )}?api_key=${encodeURIComponent(apiKey)}&external_source=imdb_id`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB error (HTTP ${res.status}): ${url}`);
  const json = (await res.json()) as unknown;
  const obj = json as {
    movie_results?: Array<{ id?: unknown }>;
    tv_results?: Array<{ id?: unknown }>;
  } | null;
  const list = type === "movie" ? obj?.movie_results : obj?.tv_results;
  const id = list?.[0]?.id;
  const out = typeof id === "number" ? id : null;
  cacheSet(tmdbCache, key, out, CACHE_TTL_6H);
  return out;
}
export async function resolveTmdbToImdb(
  tmdb_id: number,
  type: "movie" | "tv",
): Promise<string | null> {
  const tmdbCache = getTmdbCache();
  const key = `tmdb-rev:${type}:${tmdb_id}`;
  const cached = cacheGet(tmdbCache, key);
  if (cached !== null) return cached as string;

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TMDB_API_KEY is not set on server (required for server-side scraping).",
    );
  }

  // Get external IDs from TMDB
  const endpoint = type === "movie" ? "movie" : "tv";
  const url = `https://api.themoviedb.org/3/${endpoint}/${tmdb_id}/external_ids?api_key=${encodeURIComponent(apiKey)}`;
  
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB error (HTTP ${res.status}): ${url}`);
  
  const json = (await res.json()) as { imdb_id?: string | null };
  const imdb_id = json.imdb_id || null;
  
  cacheSet(tmdbCache, key, imdb_id, CACHE_TTL_6H);
  return imdb_id;
}
