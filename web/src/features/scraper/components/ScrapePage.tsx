"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/shared/components/layouts/AppShell";
import { fetchManifest } from "../lib/manifest";
import { loadSettings } from "@/features/settings/lib/client";
import { loadToggles } from "@/features/providers/lib/toggle";
import type { Manifest, ScrapeInput, ScrapeResponse } from "../types";

function providerKey(p: { id: string; filename: string }, idx: number) {
  return `${p.id}:${p.filename}:${idx}`;
}

function makeRequestId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function validateInput(input: ScrapeInput) {
  if (!/^tt\d{5,}$/.test(input.imdb_id)) {
    throw new Error("Invalid imdb_id. Expected like tt1234567");
  }
  if (input.type === "tv") {
    const hasSeason = input.season != null;
    const hasEpisode = input.episode != null;
    if (hasSeason !== hasEpisode) {
      throw new Error("For tv, season and episode must be provided together.");
    }
  }
}

export default function ScrapePage() {
  const settings = useMemo(() => loadSettings(), []);
  const toggles = useMemo(() => loadToggles(), []);

  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [manifestError, setManifestError] = useState<string | null>(null);

  const [input, setInput] = useState<ScrapeInput>({
    imdb_id: "tt",
    type: "movie",
    season: null,
    episode: null,
  });

  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<ScrapeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    fetchManifest(settings.manifestUrl)
      .then((m) => {
        if (!isMounted.current) return;
        setManifest(m);
        setManifestError(null);
      })
      .catch((e) => {
        if (!isMounted.current) return;
        setManifestError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      isMounted.current = false;
    };
  }, [settings.manifestUrl]);

  const enabledProviders = useMemo(() => {
    const list = manifest?.scrapers || [];
    return list.filter((p) => {
      const idx = list.indexOf(p);
      const override = toggles[providerKey(p, idx)];
      const enabled = typeof override === "boolean" ? override : !!p.enabled;
      if (!enabled) return false;
      if (input.type === "movie") return p.supportedTypes.includes("movie");
      return p.supportedTypes.includes("tv");
    });
  }, [manifest, toggles, input.type]);

  async function onRun() {
    setError(null);
    setResponse(null);
    setRunning(true);

    try {
      validateInput(input);
      if (!manifest) throw new Error("Manifest not loaded yet");

      const requestId = makeRequestId();
      const manifestList = manifest.scrapers;
      const providerKeys = enabledProviders.map((p) => {
        const idx = manifestList.indexOf(p);
        return providerKey(p, idx);
      });

      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manifestUrl: settings.manifestUrl,
          imdb_id: input.imdb_id,
          type: input.type,
          season: input.season ?? null,
          episode: input.episode ?? null,
          providerKeys,
          providerTimeoutMs: settings.providerTimeoutMs,
        }),
      });

      const json = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        let err: string | null = null;
        if (json && typeof json === "object" && "error" in json) {
          err = typeof json.error === "string" ? json.error : null;
        }
        throw new Error(err || `Scrape failed (HTTP ${res.status})`);
      }

      setResponse({
        ...(json as ScrapeResponse),
        requestId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppShell title="SCRAPE">
      <div style={{ display: "grid", gap: "2px" }}>
        {/* Input Form + Action Button */}
        <div className="grid-asymmetric-2-1">
          {/* Left: Input Section */}
          <div className="card">
            <div className="text-muted" style={{ marginBottom: "var(--space-4)", fontSize: "10px" }}>
              Manifest: <code className="text-mono">{settings.manifestUrl}</code>
            </div>

            {manifestError && (
              <div className="card" style={{ background: "#ffebee", borderColor: "#c62828", marginBottom: "var(--space-4)", padding: "var(--space-2)" }}>
                <div style={{ color: "#c62828", fontSize: "10px" }}>Manifest error: {manifestError}</div>
              </div>
            )}

            <label style={{ display: "grid", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
              <span className="text-label">IMDb ID</span>
              <input
                className="input input-mono"
                value={input.imdb_id}
                onChange={(e) => setInput((s) => ({ ...s, imdb_id: e.target.value }))}
                placeholder="tt1234567"
              />
            </label>

            {/* Type Toggle */}
            <div className="grid-toggle" style={{ marginBottom: input.type === "tv" ? "var(--space-4)" : 0 }}>
              <button
                type="button"
                className={`toggle-item ${input.type === "movie" ? "active" : ""}`}
                onClick={() => setInput((s) => ({ ...s, type: "movie", season: null, episode: null }))}
              >
                MOVIE
              </button>
              <button
                type="button"
                className={`toggle-item ${input.type === "tv" ? "active" : ""}`}
                onClick={() => setInput((s) => ({ ...s, type: "tv" }))}
              >
                TV
              </button>
            </div>

            {/* Season/Episode for TV */}
            {input.type === "tv" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
                <label style={{ display: "grid", gap: "var(--space-1)" }}>
                  <span className="text-label" style={{ fontSize: "10px" }}>SEASON</span>
                  <input
                    type="number"
                    className="input"
                    value={input.season ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                      setInput((s) => ({ ...s, season: val }));
                    }}
                    placeholder="1"
                  />
                </label>
                <label style={{ display: "grid", gap: "var(--space-1)" }}>
                  <span className="text-label" style={{ fontSize: "10px" }}>EPISODE</span>
                  <input
                    type="number"
                    className="input"
                    value={input.episode ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                      setInput((s) => ({ ...s, episode: val }));
                    }}
                    placeholder="1"
                  />
                </label>
              </div>
            )}

            <div className="text-muted" style={{ marginTop: "var(--space-4)", fontSize: "10px" }}>
              Providers enabled: <b>{enabledProviders.length}</b>
            </div>
          </div>

          {/* Right: Action Button */}
          <div className="section-inverted" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <button
              onClick={onRun}
              disabled={running || !manifest}
              style={{
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: running || !manifest ? "not-allowed" : "pointer",
                fontSize: "16px",
                fontWeight: 900,
                textAlign: "center",
                opacity: running || !manifest ? 0.5 : 1,
              }}
            >
              {running ? "..." : "RUN\n→"}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="card" style={{ background: "#ffebee", borderColor: "#c62828" }}>
            <div className="text-label" style={{ color: "#c62828", marginBottom: "var(--space-1)" }}>ERROR</div>
            <div style={{ color: "#c62828", fontSize: "10px" }}>{error}</div>
          </div>
        )}

        {/* Loading State */}
        {running && (
          <div className="section-inverted" style={{ padding: "var(--space-6)", textAlign: "center" }}>
            <div className="text-label" style={{ marginBottom: "var(--space-2)" }}>SCRAPING</div>
            <div style={{ display: "flex", gap: "4px", justifyContent: "center", alignItems: "center" }}>
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "8px",
                    height: "8px",
                    background: "var(--color-white)",
                    animation: `brutalistPulse 1.2s ease-in-out ${i * 0.15}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {response && (
          <div className="card" style={{ background: "var(--color-gray-light)", padding: "var(--space-6)" }}>
            <div className="text-label" style={{ marginBottom: "var(--space-4)" }}>
              RESULTS ({response.results.length})
            </div>
            
            {response.results.length === 0 ? (
              <div className="text-muted" style={{ fontSize: "10px" }}>No streams found</div>
            ) : (
              <div className="card" style={{ padding: "var(--space-4)" }}>
                {response.results.map((result, idx) => (
                  <div key={idx} className="result-row">
                    <div>
                      <div className="result-title">{result.providerName}</div>
                      {result.title && <div style={{ fontSize: "10px", marginTop: "2px" }}>{result.title}</div>}
                    </div>
                    <div className="result-quality">{result.quality || "Unknown"}</div>
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontWeight: 700, textDecoration: "underline" }}
                    >
                      LINK
                    </a>
                  </div>
                ))}
              </div>
            )}

            <div className="text-muted" style={{ marginTop: "var(--space-4)", fontSize: "10px" }}>
              Completed in {(response.timing.totalMs / 1000).toFixed(2)}s
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
