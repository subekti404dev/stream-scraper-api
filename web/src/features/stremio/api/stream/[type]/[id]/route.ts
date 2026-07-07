import { corsResponse } from "@/shared/lib/cors";
import { NextResponse } from "next/server";
import { runScrape } from "@/features/scraper/lib/engine";
import { getServerSettings } from "@/features/settings/lib/server";
import { resolveTmdbToImdb } from "@/features/scraper/lib/tmdb";
import type { RouteContext } from "@/features/scraper/types";

export async function GET(
  request: Request,
  context: RouteContext
): Promise<Response> {
  try {
    const { type, id } = await context.params;

    if (!type || !id) {
      return corsResponse(
        request,
        NextResponse.json({ streams: [] }, { status: 400, statusText: "Missing type or id" })
      );
    }

    // Load server settings for manifestUrl
    const settings = await getServerSettings();

    // Parse Stremio ID format: "tmdb:123" or "tmdb:123:1:2" (series with season:episode)
    const parts = id.replace("tmdb:", "").split(":");
    const tmdbId = parts[0];
    const season = parts[1] ? parseInt(parts[1]) : undefined;
    const episode = parts[2] ? parseInt(parts[2]) : undefined;

    // Convert TMDB ID to IMDB ID
    const mediaType = type === "series" ? "tv" : "movie";
    const imdb_id = await resolveTmdbToImdb(parseInt(tmdbId), mediaType);
    
    if (!imdb_id) {
      return corsResponse(
        request,
        NextResponse.json(
          { streams: [], error: "Could not resolve TMDB ID to IMDB ID" },
          { status: 404 }
        )
      );
    }

    const streams = await runScrape({
      manifestUrl: settings.manifestUrl,
      imdb_id,
      type: mediaType as "movie" | "tv",
      providerTimeoutMs: settings.providerTimeoutMs,
      ...(season && { season }),
      ...(episode && { episode }),
    });

    return corsResponse(request, NextResponse.json({ streams: streams.streams }));
  } catch (error) {
    console.error("[Stremio Stream] Error:", error);
    return corsResponse(
      request,
      NextResponse.json(
        { streams: [], error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      )
    );
  }
}

export async function OPTIONS(req: Request) {
  return corsResponse(req, new Response(null, { status: 204 }));
}
