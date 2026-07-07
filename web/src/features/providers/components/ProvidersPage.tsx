"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/shared/components/layouts/AppShell";
import { fetchManifest } from "../lib/manifest";
import { loadToggles, saveToggles } from "../lib/toggle";
import { loadSettings } from "@/features/settings/lib/client";
import type { Manifest, ManifestScraper, ProviderToggleMap } from "../types";

export default function ProvidersPage() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggles, setToggles] = useState<ProviderToggleMap>(() => loadToggles());
  const [filter, setFilter] = useState("");

  const settings = useMemo(() => loadSettings(), []);

  useEffect(() => {
    fetchManifest(settings.manifestUrl)
      .then((m) => {
        setManifest(m);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [settings.manifestUrl]);

  const providers = useMemo(() => {
    const list = manifest?.scrapers || [];
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) => {
      return (
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q)
      );
    });
  }, [manifest, filter]);

  const manifestKeys = useMemo(() => {
    const list = manifest?.scrapers || [];
    return list.map((p, idx) => `${p.id}:${p.filename}:${idx}`);
  }, [manifest]);

  function providerKey(p: ManifestScraper) {
    const list = manifest?.scrapers || [];
    const idx = list.indexOf(p);
    if (idx >= 0) return manifestKeys[idx] || `${p.id}:${p.filename}:${idx}`;
    return `${p.id}:${p.filename}`;
  }

  const duplicateIds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of manifest?.scrapers || []) {
      counts.set(p.id, (counts.get(p.id) || 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, c]) => c > 1)
      .map(([id, c]) => ({ id, count: c }));
  }, [manifest]);

  function isEnabled(p: ManifestScraper) {
    const key = providerKey(p);
    const override = toggles[key];
    if (typeof override === "boolean") return override;
    return !!p.enabled;
  }

  function setEnabled(providerKeyStr: string, enabled: boolean) {
    setToggles((prev) => {
      const next = { ...prev, [providerKeyStr]: enabled };
      saveToggles(next);
      return next;
    });
  }

  return (
    <AppShell title="PROVIDERS">
      <div style={{ maxWidth: "900px" }}>
        {error && (
          <div className="card" style={{ background: "#ffebee", borderColor: "#c62828", marginBottom: "var(--space-4)" }}>
            <div className="text-label" style={{ color: "#c62828", marginBottom: "var(--space-1)" }}>ERROR</div>
            <div style={{ color: "#c62828", fontSize: "10px" }}>{error}</div>
          </div>
        )}

        {!manifest ? (
          <div className="card" style={{ textAlign: "center", padding: "var(--space-6)" }}>
            <div className="text-label">LOADING...</div>
          </div>
        ) : (
          <>
            {/* Filter + Actions */}
            <div className="card" style={{ marginBottom: "var(--space-4)" }}>
              <label style={{ display: "grid", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
                <span className="text-label">FILTER</span>
                <input
                  className="input"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="id / name / description"
                />
              </label>

              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button
                  onClick={() => {
                    const next: ProviderToggleMap = { ...toggles };
                    for (const p of manifest.scrapers) next[providerKey(p)] = true;
                    setToggles(next);
                    saveToggles(next);
                  }}
                  className="btn"
                >
                  ENABLE ALL
                </button>
                <button
                  onClick={() => {
                    const next: ProviderToggleMap = { ...toggles };
                    for (const p of manifest.scrapers) next[providerKey(p)] = false;
                    setToggles(next);
                    saveToggles(next);
                  }}
                  className="btn"
                >
                  DISABLE ALL
                </button>
              </div>

              <div className="text-muted" style={{ marginTop: "var(--space-4)", fontSize: "10px" }}>
                Manifest: <code className="text-mono">{settings.manifestUrl}</code>
              </div>
              <div className="text-muted" style={{ marginTop: "var(--space-1)", fontSize: "10px" }}>
                <b>{manifest.name}</b> v{manifest.version} — {manifest.scrapers.length} providers
              </div>

              {duplicateIds.length > 0 && (
                <div style={{ marginTop: "var(--space-2)", color: "#c62828", fontSize: "10px" }}>
                  Duplicate IDs: {duplicateIds.slice(0, 6).map((d) => `${d.id}×${d.count}`).join(', ')}
                  {duplicateIds.length > 6 ? '…' : ''}
                </div>
              )}
            </div>

            {/* Provider List */}
            <div className="text-label" style={{ marginBottom: "var(--space-4)" }}>
              PROVIDERS ({providers.length})
            </div>

            <div style={{ marginBottom: "var(--space-6)" }}>
              {providers.map((p) => {
                const key = providerKey(p);
                const enabled = isEnabled(p);

                return (
                  <div key={key} className="provider-row">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => setEnabled(key, e.target.checked)}
                    />
                    <div>
                      <div className="provider-name">{p.name}</div>
                      {p.description && (
                        <div className="text-muted" style={{ fontSize: "10px", marginTop: "2px" }}>
                          {p.description}
                        </div>
                      )}
                    </div>
                    <div className="provider-badges">
                      {p.supportedTypes.map((type) => (
                        <span key={type} className="badge">{type}</span>
                      ))}
                      {p.limited && <span className="badge">LIMITED</span>}
                      {!p.enabled && <span className="badge">DISABLED</span>}
                    </div>
                  </div>
                );
              })}

              {providers.length === 0 && (
                <div className="text-muted" style={{ fontSize: "10px", textAlign: "center", padding: "var(--space-4)" }}>
                  No providers match filter
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
