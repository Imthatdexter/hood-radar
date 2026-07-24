'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DexPair } from './dexscreener';
import { ensureDex, getCachedBest } from './dexbatch';

const REFRESH_MS = 120_000; // refresh on a long cadence; prices don't need 30s

export interface DexEnrichment {
  /** lowercased-address → best DexScreener pair, or null if it has no robinhood market */
  map: Record<string, DexPair | null>;
  loading: boolean;
}

/**
 * Batch-enrich a set of token addresses with their best DexScreener market.
 * Shares a module-level cache across components/tabs and refetches every 2 min.
 */
export function useDexEnrichment(addresses: string[]): DexEnrichment {
  // Stable key so the effect only re-fires when the address set actually changes.
  const key = useMemo(() => addresses.map((a) => a.toLowerCase()).sort().join(','), [addresses]);
  const [state, setState] = useState<DexEnrichment>({ map: {}, loading: true });

  useEffect(() => {
    let alive = true;
    const list = key ? key.split(',') : [];

    const snapshot = (loading: boolean) => {
      if (!alive) return;
      const map: Record<string, DexPair | null> = {};
      for (const a of list) {
        const b = getCachedBest(a);
        if (b !== undefined) map[a] = b; // present (pair or null) — known
      }
      setState({ map, loading });
    };

    snapshot(list.length > 0);
    ensureDex(list).then(() => snapshot(false));

    const id = setInterval(() => {
      ensureDex(list).then(() => snapshot(false));
    }, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [key]);

  return state;
}
