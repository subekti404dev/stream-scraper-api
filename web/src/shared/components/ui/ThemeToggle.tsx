"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "scraper_app_theme_v1";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  // Start with a deterministic value so SSR + first client render match.
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(THEME_KEY);
      const initial =
        stored === "dark" || stored === "light" ? stored : getSystemTheme();
      setTheme(initial);
    } catch {
      setTheme(getSystemTheme());
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggle() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // ignore
      }
      document.documentElement.dataset.theme = next;
      return next;
    });
  }

  return (
    <button
      type="button"
      className="btn-secondary"
      style={{ padding: "8px", width: "40px", height: "40px", fontSize: "20px" }}
      onClick={toggle}
      suppressHydrationWarning
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
    >
      {!mounted ? null : theme === "dark" ? "☾" : "☀"}
    </button>
  );
}

