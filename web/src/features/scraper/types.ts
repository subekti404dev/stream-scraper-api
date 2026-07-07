export type Manifest = {
  name: string;
  version: string;
  scrapers: ManifestScraper[];
};

export type ManifestScraper = {
  id: string;
  name: string;
  description?: string;
  version?: string;
  author?: string;
  supportedTypes: Array<"movie" | "tv" | string>;
  filename: string;
  enabled: boolean;
  limited?: boolean;
  formats?: string[];
  logo?: string;
  contentLanguage?: string[];
  disabledPlatforms?: string[];
  supportsExternalPlayer?: boolean;
  notes?: string;
};

export type ScrapeInput = {
  imdb_id: string;
  type: "movie" | "tv";
  season?: number | null;
  episode?: number | null;
};

export type ResolvedIds = {
  imdb_id: string;
  type: "movie" | "tv";
  tmdb_id: number | null;
  title?: string | null;
  year?: number | null;
};

export type StreamResult = {
  providerId: string;
  providerName: string;
  url: string;
  title?: string;
  quality?: string;
  format?: string;
  size?: string;
  headers?: Record<string, string>;
  language?: string;
  subtitles?: Array<{ lang: string; url: string }>;
  score?: number;
  raw?: unknown;
};

export type ProviderRunStatus = "ok" | "error" | "timeout" | "skipped";

export type ProviderRun = {
  providerKey: string;
  providerId: string;
  providerName: string;
  status: ProviderRunStatus;
  durationMs: number;
  error?: string;
  resultCount?: number;
};

export type ScrapeResponse = {
  requestId: string;
  input: ScrapeInput;
  resolved: ResolvedIds;
  results: StreamResult[];
  providerRuns: ProviderRun[];
  timing: { totalMs: number };
};

export type ScrapeRequest = {
  manifestUrl: string;
  imdb_id: string;
  type: "movie" | "tv";
  season?: number | null;
  episode?: number | null;
  providerKeys?: string[];
  providerTimeoutMs?: number;
};

export type RouteContext = {
  params: Promise<{
    type: string;
    id: string;
  }>;
};
