// Batch DexScreener enrichment for token cards/strip (keyless, robinhood chain).
// The agnt.social API returns no price/holders/marketCap for tokens, so cards are
// zeroed out. DexScreener fills price/volume/liquidity/FDV instead. Its token
// endpoint accepts up to 30 comma-joined addresses per request, so a full token
// list (~98) costs ~4 calls — cached for 2 minutes to stay light. This is a
// different service from the Dune PnL query and does not touch the Dune budget.

import type { DexPair } from './dexscreener';

const ENDPOINT = 'https://api.dexscreener.com/latest/dex/tokens/';
const TTL = 120_000; // 2 minutes
const BATCH = 30; // DexScreener max addresses per request

type CacheEntry = { best: DexPair | null; expires: number };

// Module-level cache shared by every component + tab, keyed by lowercase address.
const cache = new Map<string, CacheEntry>();

function k(a: string): string {
  return a.toLowerCase();
}

/** The best (most-liquid) pair for an address, or `undefined` if unknown/stale. */
export function getCachedBest(addr: string): DexPair | null | undefined {
  const e = cache.get(k(addr));
  if (!e || Date.now() > e.expires) return undefined;
  return e.best;
}

async function fetchChunk(addrs: string[]): Promise<void> {
  if (!addrs.length) return;
  try {
    const res = await fetch(ENDPOINT + addrs.join(','), { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as { pairs?: DexPair[] | null };
    const pairs = (json.pairs ?? []).filter((p) => p.chainId === 'robinhood');

    // Keep the most-liquid pair per base token.
    const bestBy = new Map<string, DexPair>();
    for (const p of pairs) {
      const key = k(p.baseToken.address);
      const cur = bestBy.get(key);
      if (!cur || (p.liquidity?.usd ?? 0) > (cur.liquidity?.usd ?? 0)) bestBy.set(key, p);
    }

    const expires = Date.now() + TTL;
    for (const a of addrs) cache.set(k(a), { best: bestBy.get(k(a)) ?? null, expires });
  } catch {
    // Network/parse failure: leave these uncached so callers can retry next tick.
  }
}

/**
 * Ensure every address has a fresh cache entry, fetching missing/stale ones in
 * batches of 30. Resolves once all chunks are done. Safe to call repeatedly.
 */
export async function ensureDex(addrs: string[]): Promise<void> {
  const now = Date.now();
  const need = [...new Set(addrs.map(k))].filter((a) => {
    const e = cache.get(a);
    return !e || now > e.expires;
  });
  const chunks: string[][] = [];
  for (let i = 0; i < need.length; i += BATCH) chunks.push(need.slice(i, i + BATCH));
  await Promise.all(chunks.map(fetchChunk));
}
