'use client';

// localStorage-backed watchlist of wallet addresses.

import { useCallback, useEffect, useState } from 'react';

const KEY = 'hoodradar:watchlist';

const norm = (a: string) => a.toLowerCase();

export function useWatchlist() {
  const [list, setList] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      setList(Array.isArray(parsed) ? (parsed as string[]) : []);
    } catch {
      setList([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      /* ignore quota / privacy errors */
    }
  }, [list, loaded]);

  const toggle = useCallback((addr: string) => {
    setList((prev) => {
      const lc = norm(addr);
      return prev.some((a) => norm(a) === lc)
        ? prev.filter((a) => norm(a) !== lc)
        : [...prev, addr];
    });
  }, []);

  const remove = useCallback((addr: string) => {
    const lc = norm(addr);
    setList((prev) => prev.filter((a) => norm(a) !== lc));
  }, []);

  const has = useCallback(
    (addr: string) => list.some((a) => norm(a) === norm(addr)),
    [list],
  );

  return { list, toggle, remove, has, loaded };
}
