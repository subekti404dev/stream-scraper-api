import { NextResponse } from "next/server";

type CorsOptions = {
  allowOrigin?: string;
  allowMethods?: string;
  allowHeaders?: string;
  maxAgeSeconds?: number;
};

export function corsHeaders(req: Request, opts: CorsOptions = {}) {
  const reqOrigin = req.headers.get("origin");
  const origin = opts.allowOrigin ?? reqOrigin ?? "*";

  return {
    "access-control-allow-origin": origin,
    // Ensure caches don't mix responses for different Origins.
    "vary": "origin",
    "access-control-allow-methods": opts.allowMethods ?? "GET,POST,OPTIONS",
    "access-control-allow-headers":
      opts.allowHeaders ?? "content-type, authorization",
    "access-control-max-age": String(opts.maxAgeSeconds ?? 86400),
  } as const;
}

export function withCors(req: Request, res: Response, opts: CorsOptions = {}) {
  const headers = corsHeaders(req, opts);
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v);
  }
  return res;
}

export function corsPreflight(req: Request, opts: CorsOptions = {}) {
  return withCors(req, new NextResponse(null, { status: 204 }), opts);
}

export function corsResponse(
  req: Request,
  res: Response,
  opts: CorsOptions = {},
) {
  return withCors(req, res, opts);
}

