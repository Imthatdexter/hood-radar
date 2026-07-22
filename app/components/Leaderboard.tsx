'use client';

import { useMemo, useState } from 'react';
import type { Wallet } from '@/lib/types';
import { fmtNum, fmtUsd, relTime } from '@/lib/format';
import { Address, Badge, Flash, TokenLogo } from './ui';

type SortKey = 'vol24h' | 'vol7d' | 'trades24h' | 'trades7d' | 'holdingsUsd' | 'tokens';

interface Props {
  wallets: Wallet[] | null;
  error: Error | null;
  loading: boolean;
  explorerUrl?: string;
  onSelect: (address: string) => void;
  watched: (address: string) => boolean;
}

function topHolding(w: Wallet) {
  const sorted = [...w.holdings].sort((a, b) => (b.usd || 0) - (a.usd || 0));
  return sorted[0];
}

export default function Leaderboard({
  wallets,
  error,
  loading,
  explorerUrl,
  onSelect,
  watched,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('vol7d');

  const sorted = useMemo(() => {
    if (!wallets) return [];
    const arr = [...wallets];
    arr.sort((a, b) => {
      if (sortKey === 'tokens') return b.holdings.length - a.holdings.length;
      return (b[sortKey] as number) - (a[sortKey] as number);
    });
    return arr;
  }, [wallets, sortKey]);

  const Th = ({
    k,
    children,
    align = 'left',
  }: {
    k?: SortKey;
    children: React.ReactNode;
    align?: 'left' | 'right';
  }) => (
    <th
      className={k ? 'sortable' : ''}
      style={align === 'right' ? { textAlign: 'right' } : undefined}
      onClick={k ? () => setSortKey(k) : undefined}
    >
      {children}
      {k && sortKey === k ? ' ↓' : ''}
    </th>
  );

  return (
    <div className="card">
      <div className="view-head">
        <div>
          <div className="view-title">
            Smart Money Leaderboard
            <span className="nav-count">{wallets?.length ?? 0} wallets</span>
          </div>
          <div className="view-sub">
            Top wallets by 7d DEX volume on Robinhood Chain · sorted{' '}
            <span className="mono">{sortKey}</span>
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Wallet</Th>
              <Th k="vol24h" align="right">24h Vol</Th>
              <Th k="vol7d" align="right">7d Vol</Th>
              <Th k="trades24h" align="right">Trades 24h</Th>
              <Th k="tokens" align="right">Tokens</Th>
              <Th align="right">Top Holding</Th>
              <Th k="holdingsUsd" align="right">Holdings</Th>
              <Th align="right">Last Active</Th>
            </tr>
          </thead>
          <tbody>
            {error && !wallets ? (
              <tr>
                <td colSpan={9}>
                  <div className="error-state">
                    Data unavailable — {error.message}
                    <br />
                    <span style={{ color: 'var(--muted)' }}>retrying automatically…</span>
                  </div>
                </td>
              </tr>
            ) : !wallets ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={9}>
                    <div className="skeleton skeleton-row" />
                  </td>
                </tr>
              ))
            ) : (
              sorted.map((w, i) => {
                const top = topHolding(w);
                const isWatched = watched(w.address);
                return (
                  <tr
                    key={w.address}
                    className="row row-clickable"
                    onClick={() => onSelect(w.address)}
                  >
                    <td>
                      <span className={`rank ${i < 3 ? `rank--${i + 1}` : ''}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td>
                      <Address address={w.address} explorerUrl={explorerUrl} />
                      {w.capped && <span style={{ marginLeft: 6 }}><Badge kind="capped">capped</Badge></span>}
                      {isWatched && <span style={{ marginLeft: 6, color: 'var(--green)' }} title="watched">★</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Flash track={w.vol24h}>{fmtUsd(w.vol24h)}</Flash>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                      <Flash track={w.vol7d}>{fmtUsd(w.vol7d)}</Flash>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Flash track={w.trades24h}>{fmtNum(w.trades24h)}</Flash>
                    </td>
                    <td style={{ textAlign: 'right' }}>{w.holdings.length}</td>
                    <td style={{ textAlign: 'right' }}>
                      {top ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                          <TokenLogo url={top.logo} symbol={top.symbol} size={16} />
                          <span className="mono">{top.symbol}</span>
                          <span style={{ color: 'var(--muted)' }}>{fmtUsd(top.usd, { compact: true })}</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Flash track={w.holdingsUsd}>{fmtUsd(w.holdingsUsd)}</Flash>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--muted)' }}>
                      <Flash track={w.lastTs}>{relTime(w.lastTs)}</Flash>
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
