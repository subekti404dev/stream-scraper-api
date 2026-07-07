import { NextResponse } from "next/server";
import { corsResponse } from "@/shared/lib/cors";
import { runScrape } from "../lib/engine";
import type { ScrapeRequest } from "../types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let payload: ScrapeRequest;
  try {
    payload = (await req.json()) as ScrapeRequest;
  } catch {
    return corsResponse(
      req,
      NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    );
  }

  try {
    const out = await runScrape(payload);
    return corsResponse(req, NextResponse.json(out, { status: 200 }));
  } catch (e) {
    return corsResponse(
      req,
      NextResponse.json(
        { error: e instanceof Error ? e.message : String(e) },
        { status: 500 },
      ),
    );
  }
}
