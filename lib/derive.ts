// Client-side derivations: net flow, aggregations, top-holders-of-token.

import type { FeedPost, FeedTrade, Wallet } from './types';

export interface FlowSummary {
  bought: number;
  sold: number;
  swapped: number;
  volume: number;
  net: number; // bought - sold
  count: number;
}

export function netFlow(trades: FeedTrade[]): FlowSummary {
  const out: FlowSummary = {
    bought: 0,
    sold: 0,
    swapped: 0,
    volume: 0,
    net: 0,
    count: trades.length,
  };
  for (const t of trades) {
    const usd = parseFloat(t.usd) || 0;
    out.volume += usd;
    if (t.action === 'bought') {
      out.bought += usd;
      out.net += usd;
    } else if (t.action === 'sold') {
      out.sold += usd;
      out.net -= usd;
    } else if (t.action === 'swapped') {
      out.swapped += usd;
    }
  }
  return out;
}

export interface TokenAgg {
  symbol: string;
  volume: number;
  bought: number;
  sold: number;
  net: number;
  count: number;
  logoUrl?: string | null;
}

export function aggregateByToken(trades: FeedTrade[]): TokenAgg[] {
  const map = new Map<string, TokenAgg>();
  for (const t of trades) {
    const symbol = t.symbol || 'UNKNOWN';
    let cur = map.get(symbol);
    if (!cur) {
      cur = {
        symbol,
        volume: 0,
        bought: 0,
        sold: 0,
        net: 0,
        count: 0,
        logoUrl: t.logoUrl ?? null,
      };
      map.set(symbol, cur);
    }
    const usd = parseFloat(t.usd) || 0;
    cur.volume += usd;
    cur.count += 1;
    if (t.action === 'bought') {
      cur.bought += usd;
      cur.net += usd;
    } else if (t.action === 'sold') {
      cur.sold += usd;
      cur.net -= usd;
    }
  }
  return [...map.values()].sort((a, b) => b.volume - a.volume);
}

export interface AgentAgg {
  id: string;
  name: string;
  handle: string;
  glyph?: string;
  bg?: string[];
  volume: number;
  bought: number;
  sold: number;
  net: number;
  count: number;
  lastTs: string;
}

// Build agent aggregates from feed posts (filters to trade posts + chain).
export function aggregateByAgent(
  posts: FeedPost[],
  chain?: string,
): AgentAgg[] {
  const map = new Map<string, AgentAgg>();
  for (const p of posts) {
    if (p.kind !== 'trade' || !p.trade) continue;
    if (chain && p.trade.chain !== chain) continue;
    const t = p.trade;
    const a = p.author;
    let cur = map.get(a.id);
    if (!cur) {
      cur = {
        id: a.id,
        name: a.name,
        handle: a.handle,
        glyph: a.avatar?.glyph,
        bg: a.avatar?.bg,
        volume: 0,
        bought: 0,
        sold: 0,
        net: 0,
        count: 0,
        lastTs: p.createdAt,
      };
      map.set(a.id, cur);
    }
    const usd = parseFloat(t.usd) || 0;
    cur.volume += usd;
    cur.count += 1;
    if (p.createdAt > cur.lastTs) cur.lastTs = p.createdAt;
    if (t.action === 'bought') {
      cur.bought += usd;
      cur.net += usd;
    } else if (t.action === 'sold') {
      cur.sold += usd;
      cur.net -= usd;
    }
  }
  return [...map.values()].sort((a, b) => b.volume - a.volume);
}

export interface TokenHolder {
  wallet: Wallet;
  holding: Wallet['holdings'][number];
}

// Which of the top-20 wallets hold a given token (by symbol), ranked by USD value.
export function topHoldersOfToken(
  wallets: Wallet[],
  symbol: string,
): TokenHolder[] {
  const target = symbol?.toUpperCase();
  if (!target) return [];
  const out: TokenHolder[] = [];
  for (const w of wallets) {
    const h = w.holdings.find((x) => (x.symbol || '').toUpperCase() === target);
    if (h) out.push({ wallet: w, holding: h });
  }
  return out.sort((a, b) => (b.holding.usd || 0) - (a.holding.usd || 0));
}

// Extract trade posts for a given token symbol (across chains or chain-filtered).
export function tradesForToken(
  posts: FeedPost[],
  symbol: string,
  chain?: string,
): FeedTrade[] {
  const target = symbol?.toUpperCase();
  if (!target) return [];
  const out: FeedTrade[] = [];
  for (const p of posts) {
    if (p.kind !== 'trade' || !p.trade) continue;
    if (chain && p.trade.chain !== chain) continue;
    if ((p.trade.symbol || '').toUpperCase() === target) out.push(p.trade);
  }
  return out;
}
