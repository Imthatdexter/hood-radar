// Keyless, CORS-open API client for agnt.social.

import type {
  FeedResponse,
  LeaderboardResponse,
  RobinhoodChainResponse,
  WalletsResponse,
} from './types';

const BASE = 'https://agnt.social';

export const API = {
  chain: `${BASE}/api/robinhood-chain`,
  wallets: `${BASE}/api/robinhood-chain/wallets`,
  feed: `${BASE}/api/feed`,
  leaderboard: `${BASE}/api/leaderboard`,
};

export function feedUrl(cursor?: string | null): string {
  return cursor ? `${API.feed}?cursor=${encodeURIComponent(cursor)}` : API.feed;
}

async function fetchJson<T>(
  url: string,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? 12000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    const text = await res.text();
    if (!text) throw new Error(`Empty response from ${url}`);
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}

export const fetchChain = (signal?: AbortSignal) =>
  fetchJson<RobinhoodChainResponse>(API.chain, { signal });

export const fetchWallets = (signal?: AbortSignal) =>
  fetchJson<WalletsResponse>(API.wallets, { signal });

export const fetchFeedPage = (cursor?: string | null, signal?: AbortSignal) =>
  fetchJson<FeedResponse>(feedUrl(cursor), { signal });

export const fetchLeaderboard = (signal?: AbortSignal) =>
  fetchJson<LeaderboardResponse>(API.leaderboard, { signal });
