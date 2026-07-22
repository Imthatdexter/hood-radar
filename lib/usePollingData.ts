'use client';

// Polling hook: fetch on mount + every intervalMs, pause when tab hidden,
// auto-retry once on transient failure, expose loading/error/refresh.

import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePollingOptions {
  intervalMs?: number;
  paused?: boolean;
  retries?: number;
}

export interface PollingResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  lastUpdated: number | null;
  refresh: () => void;
}

export function usePollingData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  opts: UsePollingOptions = {},
): PollingResult<T> {
  const { intervalMs = 30000, paused = false, retries = 1 } = opts;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const visibleRef = useRef(true);
  const aliveRef = useRef(true);

  const load = useCallback(async () => {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const ctrl = new AbortController();
      try {
        const res = await fetcherRef.current(ctrl.signal);
        if (!aliveRef.current) return;
        setData(res);
        setError(null);
        setLoading(false);
        setLastUpdated(Date.now());
        return;
      } catch (e) {
        if (!aliveRef.current) return;
        if ((e as Error)?.name === 'AbortError') {
          // Timeout / external abort — treat as transient only on first attempt.
        }
        attempt += 1;
        if (attempt > retries) {
          setError(e as Error);
          setLoading(false);
          setLastUpdated(Date.now());
          return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }, [retries]);

  useEffect(() => {
    aliveRef.current = true;
    const onVis = () => {
      visibleRef.current = document.visibilityState === 'visible';
      if (visibleRef.current) load(); // refresh immediately on refocus
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      aliveRef.current = false;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  useEffect(() => {
    if (paused) return;
    load();
    const id = setInterval(() => {
      if (visibleRef.current) load();
    }, intervalMs);
    return () => clearInterval(id);
  }, [load, intervalMs, paused]);

  return { data, error, loading, lastUpdated, refresh: load };
}
