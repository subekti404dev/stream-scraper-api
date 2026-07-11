import { Worker } from "node:worker_threads";

export type ProviderWorkerOk = {
  ok: true;
  providerKey: string;
  providerId: string;
  providerName: string;
  durationMs: number;
  results: unknown[];
};

export type ProviderWorkerErr = {
  ok: false;
  providerKey: string;
  providerId: string;
  providerName: string;
  durationMs: number;
  error: string;
};

export type ProviderWorkerMsg = ProviderWorkerOk | ProviderWorkerErr;

export const PROVIDER_WORKER_CODE = String.raw`
const { parentPort, workerData } = require("node:worker_threads");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const nodeRequire = createRequire(process.cwd() + "/package.json");

function post(msg) {
  try { parentPort && parentPort.postMessage(msg); } catch {}
}

function safeRequire(name) {
  if (name === "cheerio-without-node-native") return nodeRequire(name);
  if (name === "crypto-js") return nodeRequire(name);
  if (name === "ws") return nodeRequire(name);
  throw new Error("Blocked require(" + JSON.stringify(name) + ")");
}

function makeFetch(timeoutMs) {
  return async function fetchWithTimeout(input, init) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...(init || {}), signal: controller.signal });
    } finally {
      clearTimeout(t);
    }
  };
}

async function run() {
  const startedAt = Date.now();
  const data = workerData;
  try {
    const t = setTimeout(() => {}, data.timeoutMs);
    const code = String(data.providerCode || "");
    if (!code) throw new Error("Missing provider code");

    const moduleShim = { exports: {} };
    const exportsShim = moduleShim.exports;

    const ctx = vm.createContext({
      console,
      setTimeout,
      clearTimeout,
      URL,
      URLSearchParams,
      AbortController,
      AbortSignal,
      global: {},
      module: moduleShim,
      exports: exportsShim,
      require: safeRequire,
      process: { env: {} },
      fetch: makeFetch(Math.min(15000, data.timeoutMs)),
    });
    ctx.global = ctx;

    const script = new vm.Script(code, { filename: data.providerId + ".js" });
    script.runInContext(ctx, { timeout: Math.min(2000, data.timeoutMs) });

    const exported = moduleShim.exports && moduleShim.exports.getStreams;
    const globalGetStreams = ctx.getStreams;
    const getStreams =
      typeof exported === "function" ? exported :
      (typeof globalGetStreams === "function" ? globalGetStreams : null);

    if (!getStreams) throw new Error("Provider did not export getStreams()");

    const { imdb_id, tmdb_id, mediaType, season, episode } = data.input;
    
    // Try primary candidate first (full args with tmdb_id if available)
    const primaryArgs = tmdb_id 
      ? [tmdb_id, mediaType, season ?? null, episode ?? null]
      : [imdb_id, mediaType, season ?? null, episode ?? null];
    
    try {
      const out = getStreams(...primaryArgs);
      const result = await Promise.resolve(out);
      clearTimeout(t);
      post({
        ok: true,
        providerId: data.providerId,
        providerName: data.providerName,
        durationMs: Date.now() - startedAt,
        results: Array.isArray(result) ? result : result == null ? [] : [result],
      });
      return;
    } catch (primaryErr) {
      // Primary failed, try fallbacks quickly
      const fallbacks = [];
      if (tmdb_id) {
        fallbacks.push([imdb_id, mediaType, season ?? null, episode ?? null]);
        fallbacks.push([tmdb_id, mediaType]);
      }
      fallbacks.push([imdb_id, mediaType]);
      
      for (const args of fallbacks) {
        try {
          const out = getStreams(...args);
          const result = await Promise.resolve(out);
          clearTimeout(t);
          post({
            ok: true,
            providerId: data.providerId,
            providerName: data.providerName,
            durationMs: Date.now() - startedAt,
            results: Array.isArray(result) ? result : result == null ? [] : [result],
          });
          return;
        } catch (e) {
          // Continue to next fallback
        }
      }
      
      // All attempts failed
      throw new Error(primaryErr && primaryErr.message ? primaryErr.message : "Provider failed");
    }

    throw new Error(lastErr && lastErr.message ? lastErr.message : "Provider failed");
  } catch (e) {
    post({
      ok: false,
      providerId: data.providerId,
      providerName: data.providerName,
      durationMs: Date.now() - startedAt,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

run();
`;


export function runProviderInWorker(args: {
  providerKey: string;
  providerId: string;
  providerName: string;
  providerUrl: string;
  providerCode: string;
  timeoutMs: number;
  input: {
    imdb_id: string;
    tmdb_id: number | null;
    mediaType: "movie" | "tv";
    season?: number | null;
    episode?: number | null;
  };
}): Promise<ProviderWorkerMsg> {
  let resolve: (value: ProviderWorkerMsg) => void;
  const promise = new Promise<ProviderWorkerMsg>((res) => {
    resolve = res;
  });
  const worker = new Worker(PROVIDER_WORKER_CODE, {
    eval: true,
    workerData: args,
  });

  const hard = setTimeout(() => {
    worker.terminate().finally(() => {
      resolve({
        ok: false,
        providerKey: args.providerKey,
        providerId: args.providerId,
        providerName: args.providerName,
        durationMs: args.timeoutMs,
        error: "timeout",
      });
    });
  }, args.timeoutMs);

  worker.on("message", (msg: ProviderWorkerMsg) => {
    clearTimeout(hard);
    resolve({ ...msg, providerKey: args.providerKey });
    worker.terminate().catch(() => {});
  });
  worker.on("error", (err) => {
    clearTimeout(hard);
    resolve({
      ok: false,
      providerKey: args.providerKey,
      providerId: args.providerId,
      providerName: args.providerName,
      durationMs: 0,
      error: err.message,
    });
    worker.terminate().catch(() => {});
  });

  return promise;
}
