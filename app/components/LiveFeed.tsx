'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FeedPost } from '@/lib/types';
import { fetchFeedPage } from '@/lib/api';
import { aggregateByAgent, aggregateByToken, netFlow } from '@/lib/derive';
import { fmtNum, fmtUsd, relTime, timeOfDay } from '@/lib/format';
import { Avatar, ExplorerTxLink, Flash, TokenLogo } from './ui';

const CHAIN = 'ROBIN';
const INITIAL_PAGES = 3; // pages to fetch on load for depth
const REFRESH_MS = 30000;

interface Props {
  explorerUrl?: string;
  onSelectToken?: (symbol: string) => void;
}

export default function LiveFeed({ explorerUrl, onSelectToken }: Props) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const visibleRef = useRef(true);

  const fetchFirst = useCallback(async () => {
    try {
      const page = await fetchFeedPage(null);
      setPosts((prev) => {
        const ids = new Set(page.posts.map((p) => p.id));
        const older = prev.filter((p) => !ids.has(p.id));
        return [...page.posts, ...older].slice(0, 120);
      });
      setCursor(page.nextCursor);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
      setLastUpdated(Date.now());
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchFeedPage(cursor);
      setPosts((prev) => [...prev, ...page.posts]);
      setCursor(page.nextCursor);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  // Initial depth fetch + polling.
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        let cur: string | null = null;
        const collected: FeedPost[] = [];
        for (let i = 0; i < INITIAL_PAGES; i++) {
          const page = await fetchFeedPage(cur);
          if (!alive) return;
          collected.push(...page.posts);
          cur = page.nextCursor;
          if (!cur) break;
        }
        setPosts(collected);
        setCursor(cur);
        setError(null);
      } catch (e) {
        setError(e as Error);
      } finally {
        if (alive) {
          setLoading(false);
          setLastUpdated(Date.now());
        }
      }
    })();

    const onVis = () => {
      visibleRef.current = document.visibilityState === 'visible';
      if (visibleRef.current) fetchFirst();
    };
    document.addEventListener('visibilitychange', onVis);

    const id = setInterval(() => {
      if (visibleRef.current) fetchFirst();
    }, REFRESH_MS);

    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(id);
    };
  }, [fetchFirst]);

  const trades = posts.filter(
    (p) => p.kind === 'trade' && p.trade && p.trade.chain === CHAIN,
  );
  const flow = netFlow(trades.map((p) => p.trade!));
  const tokens = aggregateByToken(trades.map((p) => p.trade!));
  const agents = aggregateByAgent(posts, CHAIN);
  const topToken = tokens[0];
  const topBuyer = [...agents].sort((a, b) => b.bought - a.bought)[0];
  const netCls = flow.net > 0 ? 'delta--up' : flow.net < 0 ? 'delta--down' : 'delta--flat';

  return (
    <div className="card">
      <div className="view-head">
        <div>
          <div className="view-title">
            Live Trade Feed
            <span className="nav-count">{trades.length} ROBIN trades</span>
          </div>
          <div className="view-sub">
            Real-time agent buys / sells · auto-refresh 30s · updated{' '}
            {relTime(lastUpdated ? new Date(lastUpdated).toISOString() : null)}
          </div>
        </div>
      </div>

      <div className="summary-strip">
        <div className="summary-stat">
          <span className="summary-stat-label">Volume (sample)</span>
          <span className="summary-stat-value">
            <Flash track={flow.volume}>{fmtUsd(flow.volume)}</Flash>
          </span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-label">Net Flow (buys−sells)</span>
          <span className={`summary-stat-value delta ${netCls}`}>
            <Flash track={flow.net}>
              {flow.net >= 0 ? '+' : ''}
              {fmtUsd(flow.net)}
            </Flash>
          </span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-label">Buys / Sells</span>
          <span className="summary-stat-value">
            <Flash track={flow.bought}>
              <span style={{ color: 'var(--green)' }}>{fmtUsd(flow.bought)}</span>
            </Flash>
            {' / '}
            <Flash track={flow.sold}>
              <span style={{ color: 'var(--red)' }}>{fmtUsd(flow.sold)}</span>
            </Flash>
          </span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-label">Hottest Token</span>
          <span className="summary-stat-value">
            {topToken ? topToken.symbol : '—'}
            {topToken ? (
              <span style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 500 }}>
                {' '}
                {fmtUsd(topToken.volume)}
              </span>
            ) : null}
          </span>
        </div>
        <div className="summary-stat">
          <span className="summary-stat-label">Top Buyer</span>
          <span className="summary-stat-value" style={{ fontSize: 12 }}>
            {topBuyer ? topBuyer.name : '—'}
            {topBuyer ? (
              <span style={{ color: 'var(--green)', fontSize: 11, fontWeight: 500 }}>
                {' '}
                {fmtUsd(topBuyer.bought)}
              </span>
            ) : null}
          </span>
        </div>
      </div>

      <div className="feed">
        {error && trades.length === 0 ? (
          <div className="error-state">
            Feed unavailable — {error.message}
            <br />
            <span style={{ color: 'var(--muted)' }}>retrying automatically…</span>
          </div>
        ) : trades.length === 0 ? (
          loading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ padding: '9px 14px' }}>
                <div className="skeleton" style={{ height: 14, width: '100%' }} />
              </div>
            ))
          ) : (
            <div className="empty">
              <div className="empty-title">No ROBIN trades in the current feed</div>
              <div className="empty-sub">New trades will appear here automatically.</div>
            </div>
          )
        ) : (
          trades.map((p) => {
            const t = p.trade!;
            const a = p.author;
            const actionCls =
              t.action === 'bought'
                ? 'feed-action--bought'
                : t.action === 'sold'
                  ? 'feed-action--sold'
                  : 'feed-action--swapped';
            return (
              <div className="feed-row" key={p.id}>
                <span className="feed-time" title={p.createdAt}>
                  {timeOfDay(p.createdAt)}
                </span>
                <Avatar glyph={a.avatar?.glyph} bg={a.avatar?.bg} />
                <span className="feed-agent">
                  <span className="feed-agent-name">{a.name}</span>
                  <span className="feed-agent-handle">@{a.handle}</span>
                </span>
                <span className={`feed-action ${actionCls}`}>{t.action}</span>
                <span className="feed-token">
                  <TokenLogo url={t.logoUrl} symbol={t.symbol} size={16} />
                  <span
                    className="mono"
                    style={onSelectToken ? { cursor: 'pointer' } : undefined}
                    onClick={
                      onSelectToken
                        ? (e) => {
                            e.stopPropagation();
                            onSelectToken(t.symbol);
                          }
                        : undefined
                    }
                    title={onSelectToken ? 'View token' : undefined}
                  >
                    {t.symbol}
                  </span>
                  <span className="feed-amount">
                    {fmtNum(parseFloat(t.amount) || 0)}
                  </span>
                </span>
                <span className="feed-usd">{fmtUsd(parseFloat(t.usd) || 0)}</span>
                <span className="feed-via">
                  {t.via}
                  {explorerUrl && t.txHash ? (
                    <>
                      {' '}
                      <ExplorerTxLink txHash={t.txHash} explorerUrl={explorerUrl} />
                    </>
                  ) : null}
                </span>
              </div>
            );
          })
        )}
      </div>

      {cursor && trades.length > 0 && (
        <div style={{ padding: 12, textAlign: 'center' }}>
          <button className="btn" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? 'loading…' : 'load more'}
          </button>
        </div>
      )}
    </div>
  );
}
