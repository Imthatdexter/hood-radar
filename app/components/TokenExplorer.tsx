'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FeedPost, Token, Wallet } from '@/lib/types';
import { fetchFeedPage } from '@/lib/api';
import { aggregateByAgent, type AgentAgg } from '@/lib/derive';
import { fmtNum, fmtUsd } from '@/lib/format';
import { Address, Avatar, Badge, ShareButton, TokenLogo } from './ui';
import {
  bestPair,
  dexEmbedUrl,
  dexPageUrl,
  fetchDexPairs,
  type DexPair,
} from '@/lib/dexscreener';

interface Props {
  tokens: Token[];
  wallets: Wallet[] | null;
  explorerUrl?: string;
  onSelectWallet: (address: string) => void;
  focusSymbol?: string | null;
}

type Filter = 'all' | 'official' | 'Stock' | 'ETF' | 'Core';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'official', label: 'Official' },
  { key: 'Stock', label: 'Stocks' },
  { key: 'ETF', label: 'ETFs' },
  { key: 'Core', label: 'Core' },
];

function categoryOf(t: Token): string {
  return t.category || 'ERC-20';
}

export default function TokenExplorer({
  tokens,
  wallets,
  explorerUrl,
  onSelectWallet,
  focusSymbol,
}: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Token | null>(null);
  const [feed, setFeed] = useState<FeedPost[] | null>(null);

  // If opened from the feed with a focus symbol, jump straight to that token.
  useEffect(() => {
    if (focusSymbol) {
      const t = tokens.find(
        (x) => x.symbol.toUpperCase() === focusSymbol.toUpperCase(),
      );
      if (t) setSelected(t);
    }
  }, [focusSymbol, tokens]);

  // Lazily pull a feed sample the first time a token detail opens (for top traders).
  useEffect(() => {
    if (!selected || feed) return;
    let alive = true;
    (async () => {
      try {
        let cur: string | null = null;
        const collected: FeedPost[] = [];
        for (let i = 0; i < 6; i++) {
          const page = await fetchFeedPage(cur);
          collected.push(...page.posts);
          cur = page.nextCursor;
          if (!cur) break;
        }
        if (alive) setFeed(collected);
      } catch {
        if (alive) setFeed([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [selected, feed]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return tokens
      .filter((t) => {
        if (filter === 'official' && !t.official) return false;
        if (filter === 'Stock' && !/stock/i.test(t.category)) return false;
        if (filter === 'ETF' && t.category !== 'ETF') return false;
        if (filter === 'Core' && t.category !== 'Core') return false;
        if (q && !t.symbol.toUpperCase().includes(q) && !t.name.toUpperCase().includes(q))
          return false;
        return true;
      })
      .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
  }, [tokens, query, filter]);

  if (selected) {
    return (
      <TokenDetail
        token={selected}
        wallets={wallets}
        explorerUrl={explorerUrl}
        feed={feed}
        onSelectWallet={onSelectWallet}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="card">
      <div className="view-head">
        <div>
          <div className="view-title">
            Token Explorer
            <span className="nav-count">{filtered.length} tokens</span>
          </div>
          <div className="view-sub">
            All tokens on Robinhood Chain · click for holdings & trader flow
          </div>
        </div>
        <div className="toolbar">
          <div className="search">
            <span style={{ color: 'var(--muted-2)' }}>⌕</span>
            <input
              placeholder="Search symbol or name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="chips" style={{ padding: '0 14px 12px' }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? 'chip--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No tokens match</div>
          <div className="empty-sub">Try a different search or filter.</div>
        </div>
      ) : (
        <div className="token-grid">
          {filtered.slice(0, 120).map((t) => (
            <div
              className="token-card"
              key={t.address}
              onClick={() => setSelected(t)}
            >
              <div className="token-card-head">
                <TokenLogo url={t.iconUrl} symbol={t.symbol} size={34} />
                <div style={{ minWidth: 0 }}>
                  <div className="token-card-name">{t.symbol}</div>
                  <div className="token-card-sym">{t.name}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {t.official && <Badge kind="official">off</Badge>}
                  <Badge kind={categoryOf(t)}>{categoryOf(t)}</Badge>
                </div>
              </div>
              <div className="token-card-stats">
                <div>
                  <div className="tcs-label">Price</div>
                  <div className="tcs-value">{fmtUsd(t.price, { compact: false })}</div>
                </div>
                <div>
                  <div className="tcs-label">Mkt Cap</div>
                  <div className="tcs-value">{fmtUsd(t.marketCap)}</div>
                </div>
                <div>
                  <div className="tcs-label">Vol 24h</div>
                  <div className="tcs-value">{fmtUsd(t.volume24h)}</div>
                </div>
                <div>
                  <div className="tcs-label">Holders</div>
                  <div className="tcs-value">{fmtNum(t.holders)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TokenDetail({
  token,
  wallets,
  explorerUrl,
  feed,
  onSelectWallet,
  onBack,
}: {
  token: Token;
  wallets: Wallet[] | null;
  explorerUrl?: string;
  feed: FeedPost[] | null;
  onSelectWallet: (a: string) => void;
  onBack: () => void;
}) {
  // Top holders among the smart-money wallets.
  const holders = useMemo(() => {
    if (!wallets) return [];
    const target = token.symbol.toUpperCase();
    const out: { wallet: Wallet; usd: number; balance: number }[] = [];
    for (const w of wallets) {
      const h = w.holdings.find((x) => (x.symbol || '').toUpperCase() === target);
      if (h) out.push({ wallet: w, usd: h.usd || 0, balance: h.balance || 0 });
    }
    return out.sort((a, b) => b.usd - a.usd);
  }, [wallets, token.symbol]);

  // Top traders of this token from the feed sample.
  const traders: AgentAgg[] = useMemo(() => {
    if (!feed) return [];
    const target = token.symbol.toUpperCase();
    const matching = feed.filter(
      (p) =>
        p.kind === 'trade' &&
        p.trade?.chain === 'ROBIN' &&
        (p.trade?.symbol || '').toUpperCase() === target,
    );
    return aggregateByAgent(matching).sort((a, b) => b.volume - a.volume);
  }, [feed, token.symbol]);

  return (
    <div className="card">
      <div className="view-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="token-detail-back" onClick={onBack}>
            ← back
          </span>
          <TokenLogo url={token.iconUrl} symbol={token.symbol} size={34} />
          <div>
            <div className="view-title">
              {token.symbol}
              {token.official && <Badge kind="official">official</Badge>}
              <Badge kind={categoryOf(token)}>{categoryOf(token)}</Badge>
            </div>
            <div className="view-sub">{token.name}</div>
          </div>
        </div>
        <div className="toolbar">
          <ShareButton
            text={`$${token.symbol} on Robinhood Chain — live price, liquidity & top traders via Hood Radar`}
          />
          <a
            className="btn btn--ghost"
            href={`${explorerUrl?.replace(/\/$/, '')}/token/${token.address}`}
            target="_blank"
            rel="noreferrer"
          >
            explorer ↗
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--border)', borderBottom: '1px solid var(--border)' }}>
        {[
          { l: 'Price', v: fmtUsd(token.price, { compact: false }) },
          { l: 'Market Cap', v: fmtUsd(token.marketCap) },
          { l: 'Vol 24h', v: fmtUsd(token.volume24h) },
          { l: 'Holders', v: fmtNum(token.holders) },
        ].map((s) => (
          <div className="summary-stat" key={s.l}>
            <span className="summary-stat-label">{s.l}</span>
            <span className="summary-stat-value">{s.v}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        <div className="panel-section-title">Market · DexScreener</div>
        <DexData token={token} />
      </div>

      <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <div className="panel-section-title">Held by top-20 wallets</div>
          {holders.length === 0 ? (
            <div className="empty-sub">Not held by any current top-20 wallet.</div>
          ) : (
            <div className="mini-list">
              {holders.map((h) => (
                <div
                  className="mini-list-row row-clickable"
                  key={h.wallet.address}
                  onClick={() => onSelectWallet(h.wallet.address)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Address address={h.wallet.address} explorerUrl={explorerUrl} />
                  </span>
                  <span style={{ fontWeight: 700 }}>{fmtUsd(h.usd)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="panel-section-title">Top traders (live flow)</div>
          {feed === null ? (
            <div className="empty-sub">Sampling feed…</div>
          ) : traders.length === 0 ? (
            <div className="empty-sub">No ROBIN trades for this token in the feed sample.</div>
          ) : (
            <div className="mini-list">
              {traders.slice(0, 8).map((a) => (
                <div className="mini-list-row" key={a.id}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Avatar glyph={a.glyph} bg={a.bg} />
                    <span style={{ fontWeight: 600 }}>{a.name}</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontWeight: 700 }}>{fmtUsd(a.volume)}</span>
                    <span className={`delta ${a.net >= 0 ? 'delta--up' : 'delta--down'}`}>
                      net {a.net >= 0 ? '+' : ''}
                      {fmtUsd(a.net)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function socialLabel(s: { type?: string; platform?: string; url: string }): string {
  const t = (s.type || s.platform || '').toLowerCase();
  if (t.includes('twitter') || t === 'x') return '𝕏 X';
  if (t.includes('telegram')) return '✈ telegram';
  if (t.includes('discord')) return '💬 discord';
  if (t.includes('website')) return '🌐 site';
  return '🔗 link';
}

function DexData({ token }: { token: Token }) {
  const [pairs, setPairs] = useState<DexPair[] | null>(null);
  useEffect(() => {
    let alive = true;
    setPairs(null);
    fetchDexPairs(token.address).then((p) => {
      if (alive) setPairs(p);
    });
    return () => {
      alive = false;
    };
  }, [token.address]);

  if (pairs === null) return <div className="empty-sub">Loading market data…</div>;
  const pair = bestPair(pairs);
  if (!pair) return <div className="empty-sub">No DexScreener market for this token.</div>;

  const pc = pair.priceChange ?? {};
  const changes: [string, number | undefined][] = [
    ['5m', pc.m5],
    ['1h', pc.h1],
    ['6h', pc.h6],
    ['24h', pc.h24],
  ];
  const sites = pair.info?.websites ?? [];
  const socials = pair.info?.socials ?? [];

  return (
    <div>
      <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 10 }}>
        <div>
          <div className="tcs-label">Price</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>${pair.priceUsd ?? '—'}</div>
        </div>
        {changes.map(([lbl, val]) =>
          val == null ? null : (
            <div key={lbl}>
              <div className="tcs-label">{lbl}</div>
              <div className={`delta ${val >= 0 ? 'delta--up' : 'delta--down'}`}>
                {val >= 0 ? '+' : ''}
                {val.toFixed(2)}%
              </div>
            </div>
          ),
        )}
        <div>
          <div className="tcs-label">Liquidity</div>
          <div style={{ fontWeight: 600 }}>{fmtUsd(pair.liquidity?.usd)}</div>
        </div>
        <div>
          <div className="tcs-label">Vol 24h</div>
          <div style={{ fontWeight: 600 }}>{fmtUsd(pair.volume?.h24)}</div>
        </div>
        {pair.fdv ? (
          <div>
            <div className="tcs-label">FDV</div>
            <div style={{ fontWeight: 600 }}>{fmtUsd(pair.fdv)}</div>
          </div>
        ) : null}
      </div>

      {(sites.length > 0 || socials.length > 0) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {sites.map((w) => (
            <a key={w.url} className="btn btn--ghost" href={w.url} target="_blank" rel="noreferrer">
              🌐 site
            </a>
          ))}
          {socials.map((s) => (
            <a key={s.url} className="btn btn--ghost" href={s.url} target="_blank" rel="noreferrer">
              {socialLabel(s)}
            </a>
          ))}
        </div>
      )}

      <div className="dex-chart">
        <iframe src={dexEmbedUrl(pair.pairAddress)} title="DexScreener chart" loading="lazy" />
      </div>
      <div style={{ marginTop: 6 }}>
        <a className="token-detail-back" href={dexPageUrl(pair.pairAddress)} target="_blank" rel="noreferrer">
          Open on DexScreener ↗
        </a>
      </div>
    </div>
  );
}
