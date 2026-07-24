'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DexPair } from './dexscreener';
import { ensureDex, getCachedBest } from './dexbatch';

const REFRESH_MS = 120_000; // prices don't need 30s; this stays light on DexScreener

export interface DexEnrichment {
  /** lowercased-address → best DexScreener pair, or null if it has no robinhood market */
  map: Record<string, DexPair | null>;
  loading: boolean;
}

/**
 * Enrich a set of token addresses with their best DexScreener market. Fetches are
 * one-per-token (DexScreener caps multi-token responses at ~30 pairs), run with a
 * small concurrency pool, and shared via a module cache. The map fills in
 * progressively as each token resolves, and refetching pauses when the tab is
 * hidden. Pass addresses in priority order (e.g. by volume) so important tokens
 * appear first.
 */
export function useDexEnrichment(addresses: string[]): DexEnrichment {
  // Stable key so the effect only re-fires when the address set actually changes.
  const key = useMemo(() => addresses.map((a) => a.toLowerCase()).join(','), [addresses]);
  const [state, setState] = useState<DexEnrichment>({ map: {}, loading: true });

  useEffect(() => {
    let alive = true;
    const list = key ? key.split(',') : [];

    const apply = (a: string) => {
      if (!alive) return;
      const b = getCachedBest(a);
      if (b === undefined) return; // not fetched yet
      setState((prev) => (prev.map[a] === b ? prev : { map: { ...prev.map, [a]: b }, loading: prev.loading }));
    };

    setState({ map: {}, loading: list.length > 0 });
    for (const a of list) apply(a); // instantly surface anything already cached
    ensureDex(list, apply).then(() => {
      if (alive) setState((prev) => ({ ...prev, loading: false }));
    });

    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return; // pause when tab hidden
      ensureDex(list, apply);
    }, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [key]);

  return state;
}
