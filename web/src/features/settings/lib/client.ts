"use client";

import type { AppSettings } from "../types";

const SETTINGS_KEY = "scraper_app_settings_v1";

export const defaultSettings: AppSettings = {
  manifestUrl:
    "https://raw.githubusercontent.com/yoruix/nuvio-providers/refs/heads/main/manifest.json",
  providerTimeoutMs: 30_000,
  runTimeoutMs: 90_000,
  tmdbApiKeyMode: "server",
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...defaultSettings,
      ...parsed,
    };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}
