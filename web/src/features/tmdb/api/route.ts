import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/shared/lib/cors";
import { resolveImdbToTmdb } from "../lib/resolver";

type ResolveRequest = {
  imdb_id: string;
  type: "movie" | "tv";
};

export async function OPTIONS(req: Request) {
  return corsPreflight(req);
}

export async function POST(req: Request) {
  let payload: ResolveRequest;
  try {
    payload = (await req.json()) as ResolveRequest;
  } catch {
    return withCors(req, NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));
  }

  const imdb = payload?.imdb_id;
  const type = payload?.type;
  if (!imdb || (type !== "movie" && type !== "tv")) {
    return withCors(req, NextResponse.json(
      { error: "Missing imdb_id or invalid type" },
      { status: 400 },
    ));
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return withCors(req, NextResponse.json(
      {
        error:
          "TMDB_API_KEY is not set on server. Set env TMDB_API_KEY or switch to client mode.",
      },
      { status: 500 },
    ));
  }

  try {
    const result = await resolveImdbToTmdb(imdb, type, apiKey);
    return withCors(req, NextResponse.json(result, { status: 200 }));
  } catch (e) {
    return withCors(req, NextResponse.json(
      { error: e instanceof Error ? e.message : "TMDB resolve failed" },
      { status: 502 },
    ));
  }
}
