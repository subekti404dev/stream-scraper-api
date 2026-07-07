import { corsResponse } from "@/shared/lib/cors";
import { NextResponse } from "next/server";

const STREMIO_MANIFEST = {
  id: "community.stream-scrapper",
  version: "1.0.0",
  name: "Stream Scrapper",
  description: "scrape for stream",
  resources: ["stream"],
  types: ["movie", "series"],
  catalogs: [],
  idPrefixes: ["tmdb:"],
};

export async function GET(req: Request) {
  return corsResponse(req, NextResponse.json(STREMIO_MANIFEST));
}

export async function OPTIONS(req: Request) {
  return corsResponse(req, new Response(null, { status: 204 }));
}
