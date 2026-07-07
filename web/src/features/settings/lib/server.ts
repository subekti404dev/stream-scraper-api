import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AppSettings } from "../types";

const DEFAULT_MANIFEST_URL =
  process.env.DEFAULT_MANIFEST_URL ||
  "https://raw.githubusercontent.com/yoruix/nuvio-providers/refs/heads/main/manifest.json";

const DEFAULT_SETTINGS: AppSettings = {
  manifestUrl: DEFAULT_MANIFEST_URL,
  providerTimeoutMs: 30_000,
  runTimeoutMs: 90_000,
  tmdbApiKeyMode: "server",
};

function settingsPath() {
  // Many hosts (serverless / edge-like) only allow writing under /tmp.
  // Docker compose overrides this to a persistent volume path.
  const raw = process.env.APP_SETTINGS_PATH;
  if (!raw) return "/tmp/scraper-app/settings.json";
  // Guard against misconfigured values like "/app" (directory) or empty-ish strings.
  if (raw === "/" || raw.endsWith("/")) return `${raw}settings.json`;
  return raw;
}

async function tryRead(path: string) {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as Partial<AppSettings>;
  return { ...DEFAULT_SETTINGS, ...parsed };
}

export async function getServerSettings(): Promise<AppSettings> {
  try {
    return await tryRead(settingsPath());
  } catch {
    // Fallback to tmp if primary path isn't readable in this runtime.
    try {
      return await tryRead("/tmp/scraper-app/settings.json");
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}

export async function saveServerSettings(next: AppSettings) {
  const json = JSON.stringify(next, null, 2);
  const primary = settingsPath();
  try {
    await mkdir(dirname(primary), { recursive: true });
    await writeFile(primary, json, "utf8");
    return;
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code?: unknown }).code : undefined;
    // If the filesystem is read-only / no permissions, fall back to /tmp.
    if (code !== "EACCES" && code !== "EROFS") throw e;
  }

  const fallback = "/tmp/scraper-app/settings.json";
  await mkdir(dirname(fallback), { recursive: true });
  await writeFile(fallback, json, "utf8");
}

export async function updateServerSettings(patch: Partial<AppSettings>) {
  const curr = await getServerSettings();
  const next: AppSettings = { ...curr, ...patch };
  await saveServerSettings(next);
  return next;
}

