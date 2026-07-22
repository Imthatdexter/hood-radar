'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchFeedPage, fetchLeaderboard } from '@/lib/api';
import { aggregateByAgent, type AgentAgg } from '@/lib/derive';
import { usePollingData } from '@/lib/usePollingData';
import { fmtNum, fmtUsd, relTime } from '@/lib/format';
import { Avatar, Flash } from './ui';

const FEED_PAGES = 5; // pages sampled for per-agent live flow
const FEED_REFRESH_MS = 30000;

export default function Agents() {
  const { data, error, loading } = usePollingData(fetchLeaderboard, {
    intervalMs: 45000,
  });

  const [agg, setAgg] = useState<Record<string, AgentAgg>>({});
  const [aggLoading, setAggLoading] = useState(true);

  const loadFeedSample = useCallback(async () => {
    try {
      let cur: string | null = null;
      const collected = [];
      for (let i = 0; i < FEED_PAGES; i++) {
        const page = await fetchFeedPage(cur);
        collected.push(...page.posts);
        cur = page.nextCursor;
        if (!cur) break;
      }
      const agents = aggregateByAgent(collected, 'ROBIN');
      const map: Record<string, AgentAgg> = {};
      for (const a of agents) map[a.id] = a;
      setAgg(map);
    } catch {
      /* keep prior aggregation on failure */
    } finally {
      setAggLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    loadFeedSample().then(() => {
      /* initial sample loaded */
    });
    const id = setInterval(() => {
      if (alive && document.visibilityState === 'visible') loadFeedSample();
    }, FEED_REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [loadFeedSample]);

  const agents = (data?.agents ?? []).slice().sort((a, b) => b.pts - a.pts);
  const total = data?.total;

  return (
    <div className="card">
      <div className="view-head">
        <div>
          <div className="view-title">
            Top Agents
            <span className="nav-count">
              {agents.length}
              {total != null ? ` of ${total}` : ''}
            </span>
          </div>
          <div className="view-sub">
            agnt.social agent leaderboard by points · enriched with live ROBIN
            trade flow (sample)
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Agent</th>
              <th>Owner</th>
              <th style={{ textAlign: 'right' }}>Points</th>
              <th style={{ textAlign: 'right' }}>Live Vol</th>
              <th style={{ textAlign: 'right' }}>Net Flow</th>
              <th style={{ textAlign: 'right' }}>Trades</th>
              <th style={{ textAlign: 'right' }}>Last Trade</th>
            </tr>
          </thead>
          <tbody>
            {error && !data ? (
              <tr>
                <td colSpan={8}>
                  <div className="error-state">
                    Data unavailable — {error.message}
                    <br />
                    <span style={{ color: 'var(--muted)' }}>
                      retrying automatically…
                    </span>
                  </div>
                </td>
              </tr>
            ) : !data ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={8}>
                    <div className="skeleton skeleton-row" />
                  </td>
                </tr>
              ))
            ) : (
              agents.map((a, i) => {
                const live = agg[a.agentId];
                return (
                  <tr className="row" key={a.agentId}>
                    <td>
                      <span className={`rank ${i < 3 ? `rank--${i + 1}` : ''}`}>
                        {a.rank ?? i + 1}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 9,
                        }}
                      >
                        <Avatar glyph={a.glyph} bg={a.bg} />
                        <span>
                          <span style={{ fontWeight: 600 }}>{a.name}</span>
                          <span
                            className="feed-agent-handle"
                            style={{ marginLeft: 6 }}
                          >
                            @{a.handle}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{a.ownerName || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      <Flash track={a.pts}>{fmtNum(a.pts)}</Flash>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {live ? (
                        <Flash track={live.volume}>{fmtUsd(live.volume)}</Flash>
                      ) : (
                        <span style={{ color: 'var(--muted-2)' }}>
                          {aggLoading ? '…' : '—'}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {live ? (
                        <span
                          className={`delta ${live.net >= 0 ? 'delta--up' : 'delta--down'}`}
                          style={{ fontSize: 12.5 }}
                        >
                          {live.net >= 0 ? '+' : ''}
                          {fmtUsd(live.net)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--muted-2)' }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {live ? fmtNum(live.count) : '—'}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--muted)' }}>
                      {live ? <Flash track={live.lastTs}>{relTime(live.lastTs)}</Flash> : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
