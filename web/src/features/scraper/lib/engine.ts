import type {
  ManifestScraper,
  ScrapeRequest,
  ScrapeResponse,
} from "../types";
import { validateImdb } from "./validation";
import { fetchManifest, buildProviderFileUrl } from "./manifest";
import { resolveImdbToTmdb } from "./tmdb";
import { getProviderCode } from "./fetch";
import { runProviderInWorker } from "./worker";
import type { ProviderWorkerErr } from "./worker";
import { normalizeStreams, dedupeByUrl } from "./streams";
import { runPool } from "./pool";

export async function runScrape(
  payload: ScrapeRequest,
): Promise<ScrapeResponse> {
  const startedAt = Date.now();

  validateImdb(payload.imdb_id);
  if (payload.type !== "movie" && payload.type !== "tv") {
    throw new Error("Invalid type");
  }
  if (!payload.manifestUrl) {
    throw new Error("Missing manifestUrl");
  }

  const providerTimeoutMs = Math.max(
    2_000,
    Math.min(payload.providerTimeoutMs || 15_000, 120_000),
  );

  // Start manifest fetch and TMDB resolution in parallel
  const manifestPromise = fetchManifest(payload.manifestUrl);
  const tmdbPromise = resolveImdbToTmdb(payload.imdb_id, payload.type);

  // Wait for manifest, then immediately start fetching provider codes
  const manifest = await manifestPromise;

  const allow = new Set((payload.providerKeys || []).map(String));
  const providers: Array<{ p: ManifestScraper; providerKey: string }> = [];
  for (let idx = 0; idx < manifest.scrapers.length; idx++) {
    const p = manifest.scrapers[idx] as ManifestScraper;
    const providerKey = `${p.id}:${p.filename}:${idx}`;
    if (allow.size > 0 && !allow.has(providerKey)) continue;
    const supports =
      payload.type === "movie"
        ? p.supportedTypes.includes("movie")
        : p.supportedTypes.includes("tv");
    if (!supports) continue;
    providers.push({ p, providerKey });
  }

  // Fetch provider codes immediately (runs in parallel with TMDB resolution)
  const providerCodesPromise = Promise.all(
    providers.map(async ({ p, providerKey }) => {
      const providerUrl = buildProviderFileUrl(payload.manifestUrl, p.filename);
      try {
        const code = await getProviderCode(providerUrl, providerTimeoutMs);
        return { providerKey, code };
      } catch {
        return { providerKey, code: null };
      }
    })
  );

  // Wait for both TMDB and provider codes
  const [tmdb_id, providerCodesResults] = await Promise.all([
    tmdbPromise,
    providerCodesPromise,
  ]);

  const providerCodesMap = new Map<string, string>();
  for (const { providerKey, code } of providerCodesResults) {
    if (code) providerCodesMap.set(providerKey, code);
  }

  const maxConcurrency = Math.min(30, Math.max(1, providers.length));

  const streams: Array<{
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
  const providerRuns: Array<{
    providerKey: string;
    providerId: string;
    providerName: string;
    status: "ok" | "error" | "timeout";
    durationMs: number;
    error?: string;
    resultCount?: number;
  }> = [];

  const msgs = await runPool(
    providers,
    maxConcurrency,
    async ({ p, providerKey }) => {
      const providerUrl = buildProviderFileUrl(
        payload.manifestUrl,
        p.filename,
      );
      const started = Date.now();
      try {
        const providerCode = providerCodesMap.get(providerKey);
        if (!providerCode) {
          throw new Error("Failed to fetch provider code");
        }
        const msg = await runProviderInWorker({
          providerKey,
          providerId: p.id,
          providerName: p.name,
          providerUrl,
          providerCode,
          timeoutMs: providerTimeoutMs,
          input: {
            imdb_id: payload.imdb_id,
            tmdb_id,
            mediaType: payload.type,
            season: payload.season ?? null,
            episode: payload.episode ?? null,
          },
        });
        return msg;
      } catch (e) {
        return {
          ok: false,
          providerKey,
          providerId: p.id,
          providerName: p.name,
          durationMs: Date.now() - started,
          error: e instanceof Error ? e.message : String(e),
        } satisfies ProviderWorkerErr;
      }
    },
  );

  for (const msg of msgs) {
    if (msg.ok) {
      const normalized = normalizeStreams(
        msg.results,
        msg.providerId,
        msg.providerName,
      );
      streams.push(...normalized);
      providerRuns.push({
        providerKey: msg.providerKey,
        providerId: msg.providerId,
        providerName: msg.providerName,
        status: "ok",
        durationMs: msg.durationMs,
        resultCount: normalized.length,
      });
    } else {
      providerRuns.push({
        providerKey: msg.providerKey,
        providerId: msg.providerId,
        providerName: msg.providerName,
        status: msg.error === "timeout" ? "timeout" : "error",
        durationMs: msg.durationMs,
        error: msg.error,
      });
    }
  }

  const results = dedupeByUrl(streams);

  return {
    requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    input: {
      imdb_id: payload.imdb_id,
      type: payload.type,
      season: payload.season ?? null,
      episode: payload.episode ?? null,
    },
    resolved: {
      imdb_id: payload.imdb_id,
      type: payload.type,
      tmdb_id,
      title: null,
      year: null,
    },
    results,
    providerRuns,
    timing: { totalMs: Date.now() - startedAt },
  };
}
