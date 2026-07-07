export function normalizeStreams(
  raw: unknown[],
  providerId: string,
  providerName: string,
) {
  const out: Array<{
    providerId: string;
    providerName: string;
    url: string;
    title?: string;
    quality?: string;
    size?: string;
    headers?: Record<string, string>;
    format?: string;
    raw: unknown;
  }> = [];
  for (const item of raw || []) {
    if (!item) continue;
    const obj = item as { url?: unknown; link?: unknown; [k: string]: unknown };
    const url = String(obj.url || obj.link || "");
    if (!url.startsWith("http")) continue;
    const lower = url.toLowerCase();
    const format = lower.includes(".m3u8")
      ? "m3u8"
      : lower.includes(".mpd")
        ? "mpd"
        : lower.includes(".mp4")
          ? "mp4"
          : lower.includes(".mkv")
            ? "mkv"
            : undefined;
    out.push({
      providerId,
      providerName,
      url,
      title: typeof obj.title === "string" ? (obj.title as string) : undefined,
      quality:
        typeof obj.quality === "string" ? (obj.quality as string) : undefined,
      size: typeof obj.size === "string" ? (obj.size as string) : undefined,
      headers:
        obj.headers && typeof obj.headers === "object"
          ? (obj.headers as Record<string, string>)
          : undefined,
      format,
      raw: item,
    });
  }
  return out;
}

export function dedupeByUrl<T extends { url: string }>(results: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of results) {
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    out.push(r);
  }
  return out;
}
