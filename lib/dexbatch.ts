// Per-token DexScreener enrichment (keyless, robinhood chain).
//
// The agnt.social API ships price/holders/marketCap as 0 for every token (and
// all stock market data is 0), so token/stock cards were zeroed out. DexScreener
// fills price/volume/liquidity/FDV instead.
//
// IMPORTANT: DexScreener's multi-address endpoint caps at ~30 PAIRS per response,
// so batching many tokens together silently drops most of them (the busiest pools
// fill the cap and crowd out the rest). We therefore fetch ONE token per request,
// each of which returns up to 30 pairs that all involve that token. A small
// concurrency pool keeps it fast, and a 2-minute module cache dedupes across
// components, tabs, and the detail view. This is a separate service from the
// Dune PnL query and does not touch the Dune budget.

import type { DexPair } from './dexscreener';

const ENDPOINT = 'https://api.dexscreener.com/latest/dex/tokens/';
const TTL = 120_000; // 2 minutes
const CONCURRENCY = 6; // simultaneous requests to DexScreener (be polite)

type CacheEntry = { best: DexPair | null; expires: number };

// Module-level cache shared by every component + tab, keyed by lowercase address.
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<void>>();

function k(a: string): string {
  return a.toLowerCase();
}

/** The best (most-liquid) pair for an address, or `undefined` if unknown/stale. */
export function getCachedBest(addr: string): DexPair | null | undefined {
  const e = cache.get(k(addr));
  if (!e || Date.now() > e.expires) return undefined;
  return e.best;
}

// Fetch a single token. All returned pairs involve `addr` (as base or quote), so
// the most-liquid pair is the token's representative market.
async function fetchOne(addr: string): Promise<void> {
  try {
    const res = await fetch(ENDPOINT + addr, { cache: 'no-store' });
    if (!res.ok) return;
    const json = (await res.json()) as { pairs?: DexPair[] | null };
    const rh = (json.pairs ?? []).filter((p) => p.chainId === 'robinhood');
    const best = rh.length
      ? [...rh].sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0]
      : null;
    cache.set(k(addr), { best, expires: Date.now() + TTL });
  } catch {
    // Network/parse failure: leave uncached so callers can retry next tick.
  }
}

/**
 * Ensure every address has a fresh cache entry, fetching missing/stale ones
 * one-per-request with a small concurrency limit. `onUpdate` fires per address
 * as it resolves (so UIs can fill in progressively). Safe to call repeatedly.
 */
export async function ensureDex(
  addrs: string[],
  onUpdate?: (addr: string) => void,
): Promise<void> {
  const now = Date.now();
  const need = [...new Set(addrs.map(k))].filter((a) => {
    const e = cache.get(a);
    return !e || now > e.expires;
  });

  const queue = [...need];
  const run = async () => {
    while (queue.length) {
      const a = queue.shift()!;
      let p = inflight.get(a);
      if (!p) {
        p = fetchOne(a).finally(() => inflight.delete(a));
        inflight.set(a, p);
      }
      await p;
      onUpdate?.(a);
    }
  };

  const workers = Math.min(CONCURRENCY, need.length);
  if (workers > 0) await Promise.all(Array.from({ length: workers }, run));
}
