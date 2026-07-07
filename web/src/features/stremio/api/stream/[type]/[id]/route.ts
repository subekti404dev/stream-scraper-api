import { corsResponse } from "@/shared/lib/cors";
import { NextResponse } from "next/server";
import { runScrape } from "@/features/scraper/lib/engine";
import { getServerSettings } from "@/features/settings/lib/server";
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

    // Parse Stremio ID format (strip .json extension):
    // - Movie: "tt0137523.json" -> "tt0137523"
    // - Series: "tt0944947:1:1.json" -> "tt0944947:1:1"
    const cleanId = id.replace(/\.json$/, "");
    const parts = cleanId.split(":");
    const imdb_id = parts[0];  // IMDB format (tt1234567)
    const season = parts[1] ? parseInt(parts[1]) : undefined;
    const episode = parts[2] ? parseInt(parts[2]) : undefined;

    // Validate IMDB ID format
    if (!/^tt\d+$/.test(imdb_id)) {
      return corsResponse(
        request,
        NextResponse.json(
          { streams: [], error: "Invalid IMDB ID format. Expected tt1234567" },
          { status: 400 }
        )
      );
    }

    const mediaType = type === "series" ? "tv" : "movie";
    const scrapeResult = await runScrape({
      manifestUrl: settings.manifestUrl,
      imdb_id,
      type: mediaType as "movie" | "tv",
      providerTimeoutMs: settings.providerTimeoutMs,
      ...(season && { season }),
      ...(episode && { episode }),
    });

    // Map scraper results to Stremio stream format
    const streams = scrapeResult.results.map((result) => ({
      name: result.providerName,
      title: result.quality || "Unknown",
      url: result.url,
      ...(result.headers && { behaviorHints: { notWebReady: true } }),
    }));

    return corsResponse(request, NextResponse.json({ streams }));
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
