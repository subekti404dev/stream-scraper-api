import { corsResponse } from "@/shared/lib/cors";
import { NextResponse } from "next/server";
import { runScrape } from "@/features/scraper/lib/engine";
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

    const tmdbId = id.replace("tmdb:", "").split(":")[0];
    const season = id.split(":")[1];
    const episode = id.split(":")[2];

    const mediaType = type === "series" ? "tv" : "movie";
    const streams = await runScrape({
      manifestUrl: "", // TODO: Get from settings
      imdb_id: tmdbId,
      type: mediaType as "movie" | "tv",
      ...(season && { season: parseInt(season) }),
      ...(episode && { episode: parseInt(episode) }),
    });

    return corsResponse(request, NextResponse.json({ streams }));
  } catch (error) {
    console.error("Stream error:", error);
    return corsResponse(
      request,
      NextResponse.json({ streams: [] }, { status: 500, statusText: "Internal server error" })
    );
  }
}

export async function OPTIONS(req: Request) {
  return corsResponse(req, new Response(null, { status: 204 }));
}
