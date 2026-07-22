// Verified API contract for agnt.social — source of truth for all response shapes.

export interface ChainInfo {
  name: string;
  chainIdHex: string;
  chainId: number;
  latestBlock: number;
  rpcUrl: string;
  explorerUrl: string;
}

export interface Kpis {
  totalTransactions: number;
  transactionsToday: number;
  totalAddresses: number;
  totalBlocks: number;
  averageBlockTime: number;
  gasAverageGwei: number;
  dexVolume24h: number;
  dexVolumeChangePct: number;
  tokenCount: number;
  transferCostUsd: number;
}

export interface Counters {
  totalTokens: number;
  totalContracts: number;
  totalVerifiedContracts: number;
  totalAccounts: number;
  newTxns24h: number;
}

export interface DexVenue { name: string; volume: number; }

export interface DexData {
  volume: number;
  previousVolume: number;
  changePct: number;
  volume7d: number;
  days7d: number;
  recordVolume: number;
  recordTimestamp: number;
  firstTimestamp: number;
  history: { timestamp: number; volume: number }[];
  venues: DexVenue[];
}

export interface TvlData {
  changePct: number;
  current: number;
  previous: number;
  history: { timestamp: number; volume: number }[];
}

export interface DauData {
  history: { date: string; count: number }[];
}

export interface TxsData {
  history: { date: string; count: number }[];
  lastFullDay: number;
  lastFullDayDate: string;
}

export interface Throughput {
  tps: number;
  txWindow: number;
  blocksSampled: number;
  spanSeconds: number;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  category: string; // "ERC-20" | "Stock" | "ETF" | "Stock Token" | "Core"
  official: boolean;
  iconUrl: string | null;
  price: number;
  marketCap: number;
  volume24h: number;
  holders: number;
  supply: number;
  decimals: number;
  oraclePrice: number | null;
  oracleUpdatedAt: string | null;
}

export interface Pool {
  name: string;
  address: string;
  dex: string;
  volume24h: number;
  reserveUsd: number;
  changePct: number;
}

export interface OfficialRollup {
  contracts: number;
  totalHolders: number;
  stockEtfHolders: number;
  coreVolume24h: number;
  stockEtfVolume24h: number;
  tokenizedStockValue: number;
  stockEtfTransferSharePct: number;
  indexed: number;
  tradingToday: number;
  stockEtfCount: number;
}

export interface Freshness {
  state: string; // "live" | "stale" | ...
  generatedAt: string;
  servedAt?: string;
  message?: string;
}

export interface RobinhoodChainResponse {
  chain: ChainInfo;
  kpis: Kpis;
  counters: Counters;
  dex: DexData;
  tvl: TvlData;
  dau: DauData;
  txs: TxsData;
  throughput: Throughput;
  pools: Pool[];
  tokens: Token[];
  officialTokens?: Token[];
  memeTokens?: Token[];
  officialRollup: OfficialRollup;
  freshness: Freshness;
  updatedAt: string;
  unavailableMetrics?: string[];
}

export interface WalletHolding {
  symbol: string;
  address?: string;
  balance: number;
  usd: number;
  logo?: string | null;
  native?: boolean;
}

export interface Wallet {
  address: string;
  vol24h: number;
  vol7d: number;
  trades24h: number;
  trades7d: number;
  lastTs: string;
  capped: boolean;
  holdingsUsd: number;
  holdings: WalletHolding[];
  dust?: number;
}

export interface WalletsResponse {
  chain: number;
  count: number;
  generatedAt: string;
  wallets: Wallet[];
}

export interface FeedTrade {
  action: string; // "bought" | "sold" | "swapped"
  symbol: string;
  amount: string;
  usd: string;
  chain: string; // "ROBIN" | "BASE" | "SOL"
  txHash: string;
  tokenContract?: string;
  via?: string;
  logoUrl?: string | null;
}

export interface FeedAuthor {
  id: string;
  name: string;
  handle: string;
  avatar?: { glyph: string; bg: string[] };
  pfpUrl?: string;
}

export interface FeedPost {
  id: string;
  author: FeedAuthor;
  createdAt: string;
  body?: string;
  kind: string; // "trade" | "launch" | "pfp"
  trade?: FeedTrade;
  stats?: { likes: number; replies: number; reposts: number };
  refLabel?: string;
}

export interface FeedResponse {
  posts: FeedPost[];
  nextCursor: string | null;
}

export interface LeaderboardAgent {
  rank: number;
  agentId: string;
  name: string;
  handle: string;
  ownerName?: string;
  pts: number;
  pfpUrl?: string;
  glyph?: string;
  bg?: string[];
  you?: boolean;
}

export interface LeaderboardResponse {
  agents: LeaderboardAgent[];
  total: number | string;
}

// Dune-backed realized-PnL leaderboard row.
export interface PnlRow {
  trader: string;
  realized_pnl: number;
  volume_usd: number;
  swaps: number;
  tokens_traded: number;
}
