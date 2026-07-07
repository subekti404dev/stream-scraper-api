/**
 * TMDB IMDb ID resolver
 */

function pickTmdbId(json: unknown, type: "movie" | "tv"): number | null {
  const obj = json as {
    movie_results?: Array<{ id?: unknown }>;
    tv_results?: Array<{ id?: unknown }>;
  } | null;
  const list = type === "movie" ? obj?.movie_results : obj?.tv_results;
  const id = list?.[0]?.id;
  return typeof id === "number" ? id : null;
}

export async function resolveImdbToTmdb(
  imdb_id: string,
  type: "movie" | "tv",
  apiKey: string,
): Promise<{ tmdb_id: number | null; raw: unknown }> {
  const url = `https://api.themoviedb.org/3/find/${encodeURIComponent(
    imdb_id,
  )}?api_key=${encodeURIComponent(apiKey)}&external_source=imdb_id`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`TMDB error HTTP ${res.status}`);
  }
  const json = await res.json();
  const tmdb_id = pickTmdbId(json, type);
  return { tmdb_id, raw: json };
}
