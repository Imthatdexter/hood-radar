'use client';

import { usePollingData } from '@/lib/usePollingData';
import type { PnlRow } from '@/lib/types';
import { fmtNum, fmtUsd, relTime } from '@/lib/format';
import { Address, Flash } from './ui';

interface PnlResponse {
  configured?: boolean;
  rows?: PnlRow[];
  generatedAt?: string | null;
  count?: number;
  error?: string;
}

interface Props {
  explorerUrl?: string;
}

async function fetchPnl(): Promise<PnlResponse> {
  const r = await fetch('/api/pnl', { cache: 'no-store' });
  return (await r.json()) as PnlResponse;
}

export default function PnlLeaderboard({ explorerUrl }: Props) {
  const { data, loading } = usePollingData<PnlResponse>(fetchPnl, {
    intervalMs: 60000,
  });

  const rows = data?.rows ?? [];
  const configured = data?.configured ?? !loading;
  const error = data?.error;

  return (
    <div className="card">
      <div className="view-head">
        <div>
          <div className="view-title">
            Top Traders by PnL
            <span className="nav-count">{rows.length} of 50</span>
          </div>
          <div className="view-sub">
            Realized PnL across all Robinhood Chain DEX trades · average-cost basis
            · computed on Dune, refreshed ~every 6h
            {data?.generatedAt ? ` · updated ${relTime(data.generatedAt)}` : ''}
          </div>
        </div>
      </div>

      {!configured ? (
        <SetupState />
      ) : error ? (
        <div className="error-state">
          Couldn’t load PnL — {error}
          <br />
          <span style={{ color: 'var(--muted)' }}>
            Ensure the Dune query exists and has run at least once.
          </span>
        </div>
      ) : rows.length === 0 ? (
        loading ? (
          <div className="table-wrap">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{ padding: '0 14px' }}>
                <div className="skeleton skeleton-row" />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty-title">PnL data not ready yet</div>
            <div className="empty-sub">
              The Dune query needs to finish its first scheduled run. Check back
              shortly.
            </div>
          </div>
        )
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Wallet</th>
                <th style={{ textAlign: 'right' }}>Realized PnL</th>
                <th style={{ textAlign: 'right' }}>Volume Traded</th>
                <th style={{ textAlign: 'right' }}>Swaps</th>
                <th style={{ textAlign: 'right' }}>Tokens</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w, i) => {
                const pnl = w.realized_pnl ?? 0;
                const pos = pnl >= 0;
                return (
                  <tr className="row" key={w.trader}>
                    <td>
                      <span className={`rank ${i < 3 ? `rank--${i + 1}` : ''}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td>
                      <Address address={w.trader} explorerUrl={explorerUrl} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Flash track={pnl}>
                        <span
                          className="tnum"
                          style={{
                            fontWeight: 700,
                            color: pos ? 'var(--green)' : 'var(--red)',
                          }}
                        >
                          {pos ? '+' : ''}
                          {fmtUsd(pnl)}
                        </span>
                      </Flash>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Flash track={w.volume_usd}>{fmtUsd(w.volume_usd)}</Flash>
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmtNum(w.swaps)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtNum(w.tokens_traded)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SetupState() {
  return (
    <div className="empty">
      <div className="empty-title">PnL leaderboard not configured</div>
      <div className="empty-sub" style={{ lineHeight: 1.7, textAlign: 'left', maxWidth: 560, margin: '0 auto' }}>
        <p style={{ marginTop: 0 }}>
          This view reads realized-PnL data computed on Dune. To enable it:
        </p>
        <ol style={{ paddingLeft: 18, marginBottom: 0 }}>
          <li>
            In Dune, create a query from{' '}
            <span className="mono">dune/realized_pnl.sql</span>, save it, and set
            a schedule (~every 6h). Copy the query <b>ID</b>.
          </li>
          <li>
            Set two environment variables on Vercel:{' '}
            <span className="mono">DUNE_API_KEY</span> and{' '}
            <span className="mono">DUNE_QUERY_ID</span>.
          </li>
          <li>Redeploy — data appears here within the first scheduled run.</li>
        </ol>
      </div>
    </div>
  );
}
