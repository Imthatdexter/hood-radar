'use client';

import dynamic from 'next/dynamic';
import type { RobinhoodChainResponse } from '@/lib/types';
import { fmtNum, fmtUsd, relTime } from '@/lib/format';
import { Delta, Flash } from './ui';

const Sparkline = dynamic(
  () => import('./Charts').then((m) => m.Sparkline),
  {
    ssr: false,
    loading: () => (
      <span className="skeleton" style={{ display: 'inline-block', width: 60, height: 22 }} />
    ),
  },
);

interface Props {
  chainData: RobinhoodChainResponse | null;
  error: Error | null;
  loading: boolean;
}

function KpiCard({
  label,
  value,
  children,
}: {
  label: string;
  value: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {children && <div className="kpi-foot">{children}</div>}
    </div>
  );
}

export default function ChainHeader({ chainData, error, loading }: Props) {
  const k = chainData?.kpis;
  const dex = chainData?.dex;
  const tvl = chainData?.tvl;
  const dau = chainData?.dau;
  const txs = chainData?.txs;
  const tp = chainData?.throughput;
  const fr = chainData?.freshness;
  const pools = chainData?.pools ?? [];
  const venues = dex?.venues ?? [];
  const venueTotal = venues.reduce((s, v) => s + (v.volume || 0), 0) || 1;

  const dexSeries = dex?.history?.map((h) => h.volume) ?? [];
  const tvlSeries = tvl?.history?.map((h) => h.volume) ?? [];
  const dauSeries = dau?.history?.map((h) => h.count) ?? [];
  const txSeries = txs?.history?.map((h) => h.count) ?? [];
  const lastDau = dauSeries.length ? dauSeries[dauSeries.length - 1] : null;

  const stale = fr?.state === 'stale';
  const freshCls = error
    ? 'freshness--error'
    : stale
      ? 'freshness--stale'
      : '';
  const freshLabel = error ? 'reconnecting' : stale ? 'stale data' : 'live';
  const freshTitle = fr
    ? `state: ${fr.state}\ngenerated ${relTime(fr.generatedAt)}${fr.message ? '\n' + fr.message : ''}${error ? '\n' + error.message : ''}`
    : error
      ? error.message
      : '';

  const showSkeleton = loading && !chainData;

  return (
    <div className="header">
      <div className="kpis">
        {showSkeleton ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div className="kpi" key={i}>
              <span className="skeleton" style={{ width: 60, height: 10 }} />
              <span className="skeleton" style={{ width: 80, height: 20 }} />
            </div>
          ))
        ) : (
          <>
            <KpiCard
              label="DEX Vol 24h"
              value={<Flash track={k?.dexVolume24h ?? 0}>{fmtUsd(k?.dexVolume24h)}</Flash>}
            >
              <Delta value={k?.dexVolumeChangePct} />
              <Sparkline data={dexSeries} color="#00ff88" />
            </KpiCard>

            <KpiCard label="TVL" value={<Flash track={tvl?.current ?? 0}>{fmtUsd(tvl?.current)}</Flash>}>
              <Delta value={tvl?.changePct} />
              <Sparkline data={tvlSeries} color="#00ff88" />
            </KpiCard>

            <KpiCard label="Active Users" value={<Flash track={lastDau ?? 0}>{fmtNum(lastDau)}</Flash>}>
              <Sparkline data={dauSeries} color="#4d8dff" />
            </KpiCard>

            <KpiCard label="Txns Today" value={<Flash track={k?.transactionsToday ?? 0}>{fmtNum(k?.transactionsToday)}</Flash>}>
              <Sparkline data={txSeries} color="#ffb020" />
            </KpiCard>

            <KpiCard label="Throughput" value={<Flash track={tp?.tps ?? 0}>{fmtNum(tp?.tps)}</Flash>}>
              <span className="view-sub">tps · {(k?.averageBlockTime ?? 0)}ms block</span>
            </KpiCard>

            <KpiCard label="Gas" value={`${k?.gasAverageGwei ?? '—'}`}>
              <span className="view-sub">gwei · ~{fmtUsd(k?.transferCostUsd)}/tx</span>
            </KpiCard>
          </>
        )}
      </div>

      {pools.length > 0 && (
        <div className="pools-strip">
          {pools.map((p) => (
            <div className="pool-chip" key={p.address} title={p.name}>
              <span className="pool-chip-name">{p.name}</span>
              <span className="pool-chip-vol">{fmtUsd(p.volume24h)}</span>
              <span className="pool-chip-dex">{p.dex}</span>
            </div>
          ))}
        </div>
      )}

      {venues.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="panel-section-title" style={{ marginBottom: 6 }}>
            DEX Volume by Venue
          </div>
          {venues.slice(0, 8).map((v) => {
            const pct = Math.max(1, Math.round(((v.volume || 0) / venueTotal) * 100));
            return (
              <div className="bar-row" key={v.name}>
                <span className="bar-row-label" style={{ fontSize: 11 }}>
                  {v.name}
                </span>
                <span className="bar-track">
                  <span className="bar-fill" style={{ width: `${pct}%` }} />
                </span>
                <span className="bar-value">
                  {fmtUsd(v.volume)} · {pct}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <span className={`freshness ${freshCls}`} title={freshTitle}>
          <span className="dot" />
          {freshLabel}
          {fr && !error && (
            <span style={{ opacity: 0.7 }}>· {relTime(fr.generatedAt)}</span>
          )}
        </span>
      </div>
    </div>
  );
}
