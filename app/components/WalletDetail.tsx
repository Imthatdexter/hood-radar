'use client';

import { useEffect } from 'react';
import type { Wallet } from '@/lib/types';
import { fmtNum, fmtUsd, relTime } from '@/lib/format';
import { Address, Flash, TokenLogo } from './ui';

interface Props {
  wallet: Wallet | null;
  explorerUrl?: string;
  onClose: () => void;
  isWatched: boolean;
  onToggleWatch: (address: string) => void;
}

function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="stat-box">
      <div className="stat-box-label">{label}</div>
      <div className="stat-box-value">{value}</div>
    </div>
  );
}

export default function WalletDetail({
  wallet,
  explorerUrl,
  onClose,
  isWatched,
  onToggleWatch,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!wallet) return null;

  const holdings = [...wallet.holdings].sort((a, b) => (b.usd || 0) - (a.usd || 0));
  const top5 = holdings.slice(0, 5);
  const maxUsd = top5.reduce((m, h) => Math.max(m, h.usd || 0), 0) || 1;
  const explorerAddr = explorerUrl
    ? `${explorerUrl.replace(/\/$/, '')}/address/${wallet.address}`
    : undefined;

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <aside className="panel" role="dialog" aria-label="Wallet detail">
        <div className="panel-head">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted-2)' }}>
              Wallet
            </div>
            <div style={{ marginTop: 4 }}>
              <Address address={wallet.address} explorerUrl={explorerUrl} full />
            </div>
            {wallet.capped && (
              <div style={{ marginTop: 6 }}>
                <span className="badge badge--capped">capped volume</span>
              </div>
            )}
          </div>
          <button className="x-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="panel-body">
          <div className="panel-section">
            <button
              className={`btn ${isWatched ? '' : 'btn--primary'}`}
              onClick={() => onToggleWatch(wallet.address)}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isWatched ? '★ Watching — click to unwatch' : '☆ Watch this wallet'}
            </button>
          </div>

          <div className="panel-section">
            <div className="stat-grid">
              <StatBox label="24h Volume" value={<Flash track={wallet.vol24h}>{fmtUsd(wallet.vol24h)}</Flash>} />
              <StatBox label="7d Volume" value={<Flash track={wallet.vol7d}>{fmtUsd(wallet.vol7d)}</Flash>} />
              <StatBox label="Trades 24h" value={<Flash track={wallet.trades24h}>{fmtNum(wallet.trades24h)}</Flash>} />
              <StatBox label="Trades 7d" value={fmtNum(wallet.trades7d)} />
              <StatBox label="Holdings $" value={<Flash track={wallet.holdingsUsd}>{fmtUsd(wallet.holdingsUsd)}</Flash>} />
              <StatBox label="Last Active" value={<Flash track={wallet.lastTs}>{relTime(wallet.lastTs)}</Flash>} />
            </div>
          </div>

          {top5.length > 0 && (
            <div className="panel-section">
              <div className="panel-section-title">Top Holdings (by value)</div>
              {top5.map((h) => {
                const pct = Math.max(2, Math.round(((h.usd || 0) / maxUsd) * 100));
                return (
                  <div className="bar-row" key={h.symbol + (h.address || '')}>
                    <span className="bar-row-label mono">{h.symbol}</span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="bar-value">{fmtUsd(h.usd)}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="panel-section">
            <div className="panel-section-title">
              Full Holdings ({holdings.length})
            </div>
            {holdings.map((h) => (
              <div className="holding-row" key={h.symbol + (h.address || '')}>
                <TokenLogo url={h.logo} symbol={h.symbol} size={24} />
                <div>
                  <div className="holding-sym mono">{h.symbol}</div>
                  <div className="holding-bal">
                    {fmtNum(h.balance, false)} {h.native ? '(native)' : ''}
                  </div>
                </div>
                <div />
                <div className="holding-usd">{fmtUsd(h.usd)}</div>
              </div>
            ))}
            {wallet.dust ? (
              <div style={{ fontSize: 11, color: 'var(--muted-2)', marginTop: 6 }}>
                + {wallet.dust} dust positions hidden
              </div>
            ) : null}
          </div>

          <div className="panel-section">
            <div className="panel-section-title">Recent Activity</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
              No per-wallet transaction feed is available from the API.
              {explorerAddr && (
                <>
                  {' '}
                  <a
                    href={explorerAddr}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--green)', fontWeight: 600 }}
                  >
                    Open full history on Blockscout ↗
                  </a>
                </>
              )}
              . For a live stream of trades across the chain, see the Live Feed tab.
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
