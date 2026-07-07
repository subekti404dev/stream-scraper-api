import type { Manifest } from "../types";

export async function fetchManifest(manifestUrl: string): Promise<Manifest> {
  const res = await fetch(manifestUrl, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch manifest: HTTP ${res.status}`);
  }
  const json = (await res.json()) as Manifest;
  if (!json || !Array.isArray(json.scrapers)) {
    throw new Error("Invalid manifest: missing scrapers array");
  }
  return json;
}

export function getRepoBaseUrlFromManifestUrl(manifestUrl: string): string {
  // Works for GitHub raw URLs of form .../<branch>/manifest.json
  // Example: https://raw.githubusercontent.com/yoruix/nuvio-providers/refs/heads/main/manifest.json
  // Base:    https://raw.githubusercontent.com/yoruix/nuvio-providers/refs/heads/main/
  const u = new URL(manifestUrl);
  const parts = u.pathname.split("/");
  if (parts.length < 2) return manifestUrl.replace(/manifest\.json$/, "");
  if (!u.pathname.endsWith("/manifest.json")) {
    return manifestUrl.endsWith("/")
      ? manifestUrl
      : manifestUrl.substring(0, manifestUrl.lastIndexOf("/") + 1);
  }
  const basePath = u.pathname.slice(0, -"/manifest.json".length + 1);
  return `${u.protocol}//${u.host}${basePath}`;
}

export function buildProviderFileUrl(manifestUrl: string, filename: string): string {
  if (/^https?:\/\//i.test(filename)) return filename;
  const base = getRepoBaseUrlFromManifestUrl(manifestUrl);
  return new URL(filename.replace(/^\//, ""), base).toString();
}
