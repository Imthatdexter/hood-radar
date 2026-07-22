// Server-side proxy to Dune: reads the LATEST result of the scheduled PnL query.
// The heavy query is run on a Dune schedule (not here) because it takes minutes
// and would exceed Vercel's function timeout. The Dune key never reaches the
// client — this route holds it from the server env var.
//
// Env vars (set in Vercel + local .env.local):
//   DUNE_API_KEY   – your Dune API key
//   DUNE_QUERY_ID  – the numeric id of the saved PnL query

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DUNE_API_KEY = process.env.DUNE_API_KEY;
const DUNE_QUERY_ID = process.env.DUNE_QUERY_ID;

interface Cached {
  ts: number;
  body: unknown;
}
let cache: Cached | null = null;
const CACHE_TTL_MS = 60_000; // coalesce reads to once per minute per warm instance

export async function GET() {
  if (!DUNE_API_KEY || !DUNE_QUERY_ID) {
    return NextResponse.json({ configured: false });
  }

  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.body);
  }

  try {
    const res = await fetch(
      `https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/results`,
      { headers: { 'X-Dune-Api-Key': DUNE_API_KEY }, cache: 'no-store' },
    );
    if (!res.ok) {
      const body = {
        configured: true,
        error: `Dune responded ${res.status}`,
      };
      return NextResponse.json(body, { status: 200 });
    }
    const json = await res.json();
    const rows = json?.result?.rows ?? [];
    const generatedAt =
      json?.execution_ended_at ?? json?.submitted_at ?? json?.result?.metadata?.submitted_at ?? null;
    const body = {
      configured: true,
      rows,
      generatedAt,
      count: rows.length,
    };
    cache = { ts: Date.now(), body };
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json(
      { configured: true, error: (e as Error).message },
      { status: 200 },
    );
  }
}
