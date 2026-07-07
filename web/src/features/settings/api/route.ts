import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/shared/lib/cors";
import { getServerSettings, updateServerSettings } from "../lib/server";
import { clearScrapeCaches } from "@/features/scraper/lib/cache";
import type { AppSettings } from "../types";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  return corsPreflight(req);
}

export async function GET(req: Request) {
  const settings = await getServerSettings();
  return withCors(req, NextResponse.json(settings, { status: 200 }));
}

export async function POST(req: Request) {
  let payload: Partial<AppSettings>;
  try {
    payload = (await req.json()) as Partial<AppSettings>;
  } catch {
    return withCors(req, NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));
  }

  if (payload.manifestUrl != null && typeof payload.manifestUrl !== "string") {
    return withCors(req, NextResponse.json({ error: "manifestUrl must be a string" }, { status: 400 }));
  }

  const prev = await getServerSettings();
  const next = await updateServerSettings(payload);

  if (
    typeof payload.manifestUrl === "string" &&
    payload.manifestUrl.length > 0 &&
    payload.manifestUrl !== prev.manifestUrl
  ) {
    // Switching manifests should invalidate manifest/provider code caches immediately.
    clearScrapeCaches();
  }
  return withCors(req, NextResponse.json(next, { status: 200 }));
}

