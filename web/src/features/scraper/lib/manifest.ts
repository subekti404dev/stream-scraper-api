import type { Manifest } from "../types";
import { cacheGet, cacheSet, getManifestCache, CACHE_TTL_6H } from "./cache";

export async function fetchManifest(manifestUrl: string): Promise<Manifest> {
  const manifestCache = getManifestCache();
  const cached = cacheGet(manifestCache, manifestUrl);
  if (cached) return cached as Manifest;

  const res = await fetch(manifestUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch manifest (HTTP ${res.status}): ${manifestUrl}`,
    );
  }
  const json = (await res.json()) as unknown;
  const m = json as Manifest;
  if (!m || !Array.isArray(m.scrapers)) throw new Error("Invalid manifest");
  cacheSet(manifestCache, manifestUrl, m, CACHE_TTL_6H);
  return m;
}

export function buildProviderFileUrl(manifestUrl: string, filename: string) {
  const url = new URL(manifestUrl);
  const parts = url.pathname.split("/");
  parts.pop();
  parts.push(filename);
  url.pathname = parts.join("/");
  return url.toString();
}
