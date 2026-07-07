"use client";

import type { ProviderToggleMap } from "../types";

const TOGGLES_KEY = "scraper_app_provider_toggles_v1";

export function loadToggles(): ProviderToggleMap {
  try {
    const raw = localStorage.getItem(TOGGLES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ProviderToggleMap;
  } catch {
    return {};
  }
}

export function saveToggles(t: ProviderToggleMap) {
  localStorage.setItem(TOGGLES_KEY, JSON.stringify(t));
}
