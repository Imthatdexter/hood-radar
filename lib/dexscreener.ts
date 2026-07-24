// Keyless DexScreener client (CORS-open, no key). Robinhood Chain = "robinhood".
// Used to enrich the Token Explorer with live price changes, liquidity, FDV,
// socials, and an embeddable chart.

export interface DexSocial {
  platform?: string;
  type?: string;
  url: string;
}
export interface DexInfo {
  socials?: DexSocial[];
  websites?: { url: string }[];
  imageUrl?: string;
}
export interface DexPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken?: { address: string; name: string; symbol: string };
  priceUsd?: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  volume?: { h24?: number; h6?: number; h1?: number };
  liquidity?: { usd?: number };
  fdv?: number;
  marketCap?: number;
  info?: DexInfo;
}
interface DexResponse {
  pairs?: DexPair[] | null;
}

export async function fetchDexPairs(
  tokenAddress: string,
  signal?: AbortSignal,
): Promise<DexPair[]> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { signal, cache: 'no-store' },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as DexResponse;
    return (json.pairs ?? []).filter((p) => p.chainId === 'robinhood');
  } catch {
    return [];
  }
}

// Coerce DexScreener's stringly-typed numbers to a finite number (0 if absent).
export function dexNum(v: string | number | undefined | null): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'string' && v !== '') {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }
  return 0;
}

// Pick the most liquid pair as the "primary" market for a token.
export function bestPair(pairs: DexPair[]): DexPair | null {
  if (!pairs.length) return null;
  return [...pairs].sort(
    (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
  )[0];
}

export function dexEmbedUrl(pairAddress: string): string {
  return `https://dexscreener.com/robinhood/${pairAddress}?embed=1&theme=dark&loadChartSettings=1&trades=0&tabs=0&info=0`;
}

export function dexPageUrl(pairAddress: string): string {
  return `https://dexscreener.com/robinhood/${pairAddress}`;
}
