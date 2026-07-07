"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/shared/components/layouts/AppShell";
import { loadSettings, saveSettings } from "../lib/client";
import type { AppSettings } from "../types";

type NuvioPlugin = {
  name?: string;
  author?: string;
  description?: string;
  installUrl?: string;
  types?: string[];
  languages?: string[];
};

const NUVIO_DATA_URL = "https://nuvioplugin.com/data.js?v=2.0";

function parseNuvioDataJs(text: string): NuvioPlugin[] {
  const idx = text.indexOf("const plugins");
  if (idx === -1) throw new Error("Invalid data.js (missing plugins array)");

  // Execute in a tiny function scope and only return `plugins`.
  // data.js is not JSON; it is JS (const plugins = [...]).
  const fn = new Function(`${text}\n; return typeof plugins !== "undefined" ? plugins : [];`);
  const out = fn() as unknown;
  if (!Array.isArray(out)) return [];
  return out as NuvioPlugin[];
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [manifestMode, setManifestMode] = useState<"custom" | "preset">("custom");
  const [plugins, setPlugins] = useState<NuvioPlugin[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(false);
  const [pluginsError, setPluginsError] = useState<string | null>(null);
  const [selectedInstallUrl, setSelectedInstallUrl] = useState<string>("");

  async function loadPlugins() {
    setPluginsLoading(true);
    setPluginsError(null);
    try {
      const res = await fetch(NUVIO_DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load data.js (HTTP ${res.status})`);
      const text = await res.text();
      const list = parseNuvioDataJs(text).filter((p) => typeof p.installUrl === "string");
      setPlugins(list);

      // Try to match current manifestUrl to a preset on first load/refresh.
      const current = settings.manifestUrl;
      const match = list.find((p) => p.installUrl === current)?.installUrl;
      if (match) {
        setManifestMode("preset");
        setSelectedInstallUrl(match);
      } else if (!selectedInstallUrl) {
        setSelectedInstallUrl(list[0]?.installUrl || "");
      }
    } catch (e) {
      setPluginsError(e instanceof Error ? e.message : String(e));
      setPlugins([]);
    } finally {
      setPluginsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadPlugins());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Sync from server so non-browser consumers (e.g. Stremio) use the same manifest.
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: AppSettings | null) => {
        if (!s || typeof s.manifestUrl !== "string") return;
        setSettings((prev) => ({ ...prev, manifestUrl: s.manifestUrl }));
      })
      .catch(() => {});
  }, []);

  async function saveAll() {
    setSaveError(null);
    // Keep localStorage for the UI.
    saveSettings(settings);

    // Persist server-side for Stremio / external calls.
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        manifestUrl: settings.manifestUrl,
        providerTimeoutMs: settings.providerTimeoutMs,
        runTimeoutMs: settings.runTimeoutMs,
        tmdbApiKeyMode: settings.tmdbApiKeyMode,
        tmdbApiKeyClient: settings.tmdbApiKeyClient,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      setSaveError(text || `Failed to save (HTTP ${res.status})`);
      return;
    }
    const next = (await res.json().catch(() => null)) as Partial<AppSettings> | null;
    if (next?.manifestUrl) {
      setSettings((prev) => ({ ...prev, manifestUrl: String(next.manifestUrl) }));
    }
    setSavedAt(Date.now());
  }

  return (
    <AppShell title="SETTINGS">
      <div style={{ maxWidth: "900px" }}>
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <div className="text-heading" style={{ marginBottom: "var(--space-4)" }}>MANIFEST</div>

          {/* Mode Toggle */}
          <div className="grid-toggle" style={{ marginBottom: "var(--space-4)" }}>
            <button
              type="button"
              className={`toggle-item ${manifestMode === "custom" ? "active" : ""}`}
              onClick={() => setManifestMode("custom")}
            >
              CUSTOM URL
            </button>
            <button
              type="button"
              className={`toggle-item ${manifestMode === "preset" ? "active" : ""}`}
              onClick={() => setManifestMode("preset")}
            >
              NUVIO LIST
            </button>
            <button
              type="button"
              className="toggle-item"
              onClick={() => loadPlugins()}
              disabled={pluginsLoading}
              style={{ cursor: pluginsLoading ? "not-allowed" : "pointer", opacity: pluginsLoading ? 0.5 : 1 }}
            >
              {pluginsLoading ? "..." : "REFRESH"}
            </button>
          </div>

          {/* Preset Mode */}
          {manifestMode === "preset" && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <label style={{ display: "grid", gap: "var(--space-2)" }}>
                <span className="text-label">PRESET MANIFEST</span>
                <select
                  className="input"
                  value={selectedInstallUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setSelectedInstallUrl(url);
                    if (url) setSettings((s) => ({ ...s, manifestUrl: url }));
                  }}
                  disabled={pluginsLoading || plugins.length === 0}
                >
                  {plugins.length === 0 ? (
                    <option value="">(No presets loaded)</option>
                  ) : (
                    plugins.map((p) => {
                      const url = String(p.installUrl || "");
                      const label = `${p.name || "Unknown"}${p.author ? ` — ${p.author}` : ""}`;
                      return (
                        <option key={url} value={url}>
                          {label}
                        </option>
                      );
                    })
                  )}
                </select>
              </label>
              {pluginsError && (
                <div style={{ marginTop: "var(--space-2)", color: "#c62828", fontSize: "10px" }}>
                  Failed to load presets: {pluginsError}
                </div>
              )}
              <div className="text-muted" style={{ marginTop: "var(--space-2)", fontSize: "10px" }}>
                Source: <code className="text-mono">{NUVIO_DATA_URL}</code>
              </div>
            </div>
          )}

          {/* Custom Mode */}
          {manifestMode === "custom" && (
            <label style={{ display: "grid", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
              <span className="text-label">MANIFEST URL</span>
              <input
                className="input input-mono"
                value={settings.manifestUrl}
                onChange={(e) => setSettings((s) => ({ ...s, manifestUrl: e.target.value }))}
                placeholder="https://.../manifest.json"
              />
            </label>
          )}

          <div className="text-muted" style={{ fontSize: "10px" }}>
            Contoh: <code className="text-mono" style={{ fontSize: "10px" }}>https://raw.githubusercontent.com/yoruix/nuvio-providers/refs/heads/main/manifest.json</code>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <button
            onClick={() => {
              saveAll().catch((e) => setSaveError(e instanceof Error ? e.message : String(e)));
            }}
            className="btn"
          >
            SAVE
          </button>
          {savedAt && (
            <span className="text-muted" style={{ fontSize: "10px" }}>
              Saved {new Date(savedAt).toLocaleTimeString()}
            </span>
          )}
          {saveError && (
            <span style={{ color: "#c62828", fontSize: "10px" }}>{saveError}</span>
          )}
        </div>
      </div>
    </AppShell>
  );
}

