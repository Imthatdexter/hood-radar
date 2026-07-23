'use client';

import type { PnlRow, Wallet } from '@/lib/types';
import { fmtUsd, relTime } from '@/lib/format';
import { Address, Flash } from './ui';

interface Props {
  watched: string[];
  wallets: Wallet[] | null;
  pnlRows: PnlRow[];
  explorerUrl?: string;
  loading: boolean;
  onSelect: (address: string) => void;
  onRemove: (address: string) => void;
}

export default function Watchlist({
  watched,
  wallets,
  pnlRows,
  explorerUrl,
  loading,
  onSelect,
  onRemove,
}: Props) {
  const walletByAddr = new Map((wallets ?? []).map((w) => [w.address.toLowerCase(), w]));
  const pnlByAddr = new Map(pnlRows.map((p) => [p.trader.toLowerCase(), p]));

  // Resolve each watched address to whatever data we have (agnt volume, PnL, or neither).
  const rows = watched.map((addr) => {
    const lc = addr.toLowerCase();
    return { addr, wallet: walletByAddr.get(lc), pnl: pnlByAddr.get(lc) };
  });

  return (
    <div className="card">
      <div className="view-head">
        <div>
          <div className="view-title">
            Watchlist
            <span className="nav-count">{watched.length} saved</span>
          </div>
          <div className="view-sub">
            Persisted in your browser · volumes refresh every 30s, PnL ~every 6h
          </div>
        </div>
      </div>

      <div className="table-wrap">
        {watched.length === 0 ? (
          <div className="empty">
            <div className="empty-title">No watched wallets yet</div>
            <div className="empty-sub">
              Open a wallet from the PnL leaderboard or volume leaderboard and hit
              “Watch” to track it here.
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Wallet</th>
                <th style={{ textAlign: 'right' }}>Realized PnL</th>
                <th style={{ textAlign: 'right' }}>7d Vol</th>
                <th style={{ textAlign: 'right' }}>Holdings</th>
                <th style={{ textAlign: 'right' }}>Last Active</th>
                <th style={{ textAlign: 'right' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && !wallets ? (
                <tr>
                  <td colSpan={6}>
                    <div className="skeleton skeleton-row" />
                  </td>
                </tr>
              ) : (
                rows.map(({ addr, wallet: w, pnl: p }) => {
                  if (!w && !p) {
                    return (
                      <tr key={addr}>
                        <td>
                          <Address address={addr} explorerUrl={explorerUrl} />
                        </td>
                        <td colSpan={4} style={{ color: 'var(--muted)', fontSize: 12 }}>
                          Not in current leaderboards — live data unavailable
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn--ghost"
                            onClick={() => onRemove(addr)}
                            title="Remove from watchlist"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  }
                  const pnlPos = (p?.realized_pnl ?? 0) >= 0;
                  return (
                    <tr
                      key={addr}
                      className="row row-clickable"
                      onClick={() => onSelect(addr)}
                    >
                      <td>
                        <Address address={addr} explorerUrl={explorerUrl} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {p ? (
                          <Flash track={p.realized_pnl}>
                            <span style={{ fontWeight: 700, color: pnlPos ? 'var(--green)' : 'var(--red)' }}>
                              {pnlPos ? '+' : ''}
                              {fmtUsd(p.realized_pnl)}
                            </span>
                          </Flash>
                        ) : (
                          <span style={{ color: 'var(--muted-2)' }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {w ? <Flash track={w.vol7d}>{fmtUsd(w.vol7d)}</Flash> : <span style={{ color: 'var(--muted-2)' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {w ? fmtUsd(w.holdingsUsd) : <span style={{ color: 'var(--muted-2)' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--muted)' }}>
                        {w ? relTime(w.lastTs) : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn--ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(addr);
                          }}
                          title="Remove from watchlist"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
