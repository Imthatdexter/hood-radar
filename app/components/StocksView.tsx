'use client';

import { useMemo } from 'react';
import type { Token } from '@/lib/types';
import { dexNum } from '@/lib/dexscreener';
import { useDexEnrichment } from '@/lib/useDexEnrichment';
import { fmtNum, fmtPrice, fmtUsd } from '@/lib/format';
import { Badge, CardStat, CopyAddress, Dash, TokenLogo } from './ui';

interface Props {
  tokens: Token[];
  explorerUrl?: string;
  onSelectToken: (symbol: string) => void;
}

function isSecurity(t: Token): boolean {
  return /stock|etf/i.test(t.category || '');
}

export default function StocksView({ tokens, onSelectToken }: Props) {
  const stocks = useMemo(() => tokens.filter(isSecurity), [tokens]);

  // The agnt API ships 0 for every stock's price/volume/holders, so we pull the
  // real market from DexScreener (one batched request for all stock addresses).
  const stockAddrs = useMemo(() => stocks.map((s) => s.address), [stocks]);
  const { map: enrich, loading } = useDexEnrichment(stockAddrs);

  const pairOf = (t: Token) => enrich[t.address.toLowerCase()];

  // Coverage + rollup computed from the live DexScreener data.
  const covered = stocks.filter((t) => pairOf(t));
  const tokenizedValue = covered.reduce(
    (s, t) => s + dexNum(pairOf(t)?.fdv),
    0,
  );
  const stockVol = covered.reduce(
    (s, t) => s + dexNum(pairOf(t)?.volume?.h24),
    0,
  );
  const stockLiq = covered.reduce(
    (s, t) => s + dexNum(pairOf(t)?.liquidity?.usd),
    0,
  );

  const sorted = useMemo(
    () =>
      [...stocks].sort(
        (a, b) => dexNum(pairOf(b)?.volume?.h24) - dexNum(pairOf(a)?.volume?.h24),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stocks, enrich],
  );

  const rollupStats = [
    { l: 'Tokenized Value', v: tokenizedValue ? fmtUsd(tokenizedValue) : <Dash /> },
    { l: 'Stock Vol 24h', v: stockVol ? fmtUsd(stockVol) : <Dash /> },
    { l: 'Stock Liquidity', v: stockLiq ? fmtUsd(stockLiq) : <Dash /> },
    { l: 'Live Markets', v: `${covered.length}/${stocks.length}` },
    { l: 'Stock Tokens', v: fmtNum(stocks.length) },
  ];

  return (
    <div className="card">
      <div className="view-head">
        <div>
          <div className="view-title">
            Tokenized Stocks & ETFs
            <span className="nav-count">{stocks.length} listed</span>
          </div>
          <div className="view-sub">
            Real-world equities tokenized on Robinhood Chain — live price, volume
            &amp; liquidity via DexScreener. Tap one for its chart &amp; traders.
          </div>
        </div>
      </div>

      <div className="summary-strip">
        {rollupStats.map((s) => (
          <div className="summary-stat" key={s.l}>
            <span className="summary-stat-label">{s.l}</span>
            <span className="summary-stat-value">{s.v}</span>
          </div>
        ))}
      </div>

      {stocks.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No stock/ETF tokens in current data</div>
          <div className="empty-sub">
            The chain snapshot may be stale — stock tokens appear here when the
            feed is fresh.
          </div>
        </div>
      ) : (
        <div className="token-grid">
          {sorted.slice(0, 120).map((t) => {
            const p = pairOf(t);
            const price = dexNum(p?.priceUsd);
            const vol = dexNum(p?.volume?.h24);
            const liq = dexNum(p?.liquidity?.usd);
            const fdv = dexNum(p?.fdv);
            return (
              <div
                className="token-card"
                key={t.address}
                onClick={() => onSelectToken(t.symbol)}
              >
                <div className="token-card-head">
                  <TokenLogo url={t.iconUrl} symbol={t.symbol} size={34} />
                  <div style={{ minWidth: 0 }}>
                    <div className="token-card-name">{t.symbol}</div>
                    <div className="token-card-sym">{t.name}</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <Badge kind={t.category === 'ETF' ? 'ETF' : 'Stock'}>
                      {t.category}
                    </Badge>
                  </div>
                </div>
                <div className="token-card-stats">
                  <CardStat label="Price">{price ? fmtPrice(price) : <Dash />}</CardStat>
                  <CardStat label="Vol 24h">{vol ? fmtUsd(vol) : <Dash />}</CardStat>
                  <CardStat label="Liquidity">{liq ? fmtUsd(liq) : <Dash />}</CardStat>
                  <CardStat label="FDV">{fdv ? fmtUsd(fdv) : <Dash />}</CardStat>
                </div>
                <div className="token-card-addr">
                  <CopyAddress address={t.address} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loading && stocks.length > 0 && (
        <div className="view-sub" style={{ padding: '0 14px 12px' }}>
          Loading live market data from DexScreener…
        </div>
      )}
    </div>
  );
}
