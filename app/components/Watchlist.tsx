'use client';

import type { Wallet } from '@/lib/types';
import { fmtNum, fmtUsd, relTime } from '@/lib/format';
import { Address, Flash, TokenLogo } from './ui';

interface Props {
  watched: string[];
  wallets: Wallet[] | null;
  explorerUrl?: string;
  loading: boolean;
  onSelect: (address: string) => void;
  onRemove: (address: string) => void;
}

function topHolding(w: Wallet) {
  return [...w.holdings].sort((a, b) => (b.usd || 0) - (a.usd || 0))[0];
}

export default function Watchlist({
  watched,
  wallets,
  explorerUrl,
  loading,
  onSelect,
  onRemove,
}: Props) {
  const byAddr = new Map((wallets ?? []).map((w) => [w.address.toLowerCase(), w]));
  const present = watched
    .map((a) => byAddr.get(a.toLowerCase()))
    .filter(Boolean) as Wallet[];
  const missing = watched.filter((a) => !byAddr.has(a.toLowerCase()));

  return (
    <div className="card">
      <div className="view-head">
        <div>
          <div className="view-title">
            Watchlist
            <span className="nav-count">{watched.length} saved</span>
          </div>
          <div className="view-sub">
            Persisted in your browser · volumes refresh every 30s with the leaderboard
          </div>
        </div>
      </div>

      <div className="table-wrap">
        {watched.length === 0 ? (
          <div className="empty">
            <div className="empty-title">No watched wallets yet</div>
            <div className="empty-sub">
              Open a wallet from the Leaderboard and hit “Watch” to track it here.
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Wallet</th>
                <th style={{ textAlign: 'right' }}>24h Vol</th>
                <th style={{ textAlign: 'right' }}>7d Vol</th>
                <th style={{ textAlign: 'right' }}>Holdings</th>
                <th style={{ textAlign: 'right' }}>Top Holding</th>
                <th style={{ textAlign: 'right' }}>Last Active</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && !wallets ? (
                <tr>
                  <td colSpan={7}>
                    <div className="skeleton skeleton-row" />
                  </td>
                </tr>
              ) : (
                <>
                  {present.map((w) => {
                    const top = topHolding(w);
                    return (
                      <tr
                        key={w.address}
                        className="row row-clickable"
                        onClick={() => onSelect(w.address)}
                      >
                        <td>
                          <Address address={w.address} explorerUrl={explorerUrl} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Flash track={w.vol24h}>{fmtUsd(w.vol24h)}</Flash>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>
                          <Flash track={w.vol7d}>{fmtUsd(w.vol7d)}</Flash>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Flash track={w.holdingsUsd}>{fmtUsd(w.holdingsUsd)}</Flash>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {top ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                justifyContent: 'flex-end',
                              }}
                            >
                              <TokenLogo url={top.logo} symbol={top.symbol} size={16} />
                              <span className="mono">{top.symbol}</span>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--muted)' }}>
                          {relTime(w.lastTs)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn--ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemove(w.address);
                            }}
                            title="Remove from watchlist"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {missing.map((a) => (
                    <tr key={a}>
                      <td>
                        <Address address={a} explorerUrl={explorerUrl} />
                      </td>
                      <td colSpan={5} style={{ color: 'var(--muted)', fontSize: 12 }}>
                        Not in current top-20 — live volume unavailable
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn--ghost"
                          onClick={() => onRemove(a)}
                          title="Remove from watchlist"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
