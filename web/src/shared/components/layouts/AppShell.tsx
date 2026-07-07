"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "../ui/ThemeToggle";

const nav = [
  { href: "/scrape", label: "SCRAPE" },
  { href: "/providers", label: "PROVIDERS" },
  { href: "/settings", label: "SETTINGS" },
] as const;

export function AppShell(props: { title?: string; children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="grid-header" style={{ position: "sticky", top: 0, zIndex: 10 }}>
        <div className="section-inverted" style={{ padding: "20px" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <h1 className="text-display" style={{ margin: 0 }}>SCRAPER</h1>
          </Link>
        </div>
        
        <div style={{ background: "var(--color-white)", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          {nav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="text-label"
                style={{
                  textDecoration: isActive ? "underline" : "none",
                  color: "var(--color-black)",
                }}
              >
                {item.label}
              </Link>
            );
          })}
          <div style={{ marginLeft: "auto" }}>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main style={{ flex: 1, padding: "var(--space-6)" }}>
        {props.title && <h2 className="text-heading" style={{ marginBottom: "var(--space-4)" }}>{props.title}</h2>}
        {props.children}
      </main>
    </div>
  );
}

