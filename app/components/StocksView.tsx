'use client';

import type { OfficialRollup, Token } from '@/lib/types';
import { fmtNum, fmtUsd } from '@/lib/format';
import { Badge, TokenLogo } from './ui';

interface Props {
  tokens: Token[];
  rollup?: OfficialRollup;
  explorerUrl?: string;
  onSelectToken: (symbol: string) => void;
}

function isSecurity(t: Token): boolean {
  return /stock|etf/i.test(t.category || '');
}

export default function StocksView({
  tokens,
  rollup,
  explorerUrl,
  onSelectToken,
}: Props) {
  const stocks = tokens
    .filter(isSecurity)
    .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));

  const r = rollup;
  const rollupStats = r
    ? [
        { l: 'Tokenized Value', v: fmtUsd(r.tokenizedStockValue) },
        { l: 'Stock Vol 24h', v: fmtUsd(r.stockEtfVolume24h) },
        { l: 'Stock Holders', v: fmtNum(r.stockEtfHolders) },
        { l: 'Trading Today', v: fmtNum(r.tradingToday) },
        { l: 'Stock Tokens', v: fmtNum(r.stockEtfCount) },
      ]
    : [];

  return (
    <div className="card">
      <div className="view-head">
        <div>
          <div className="view-title">
            Tokenized Stocks & ETFs
            <span className="nav-count">{stocks.length} listed</span>
          </div>
          <div className="view-sub">
            Real-world equities tokenized on Robinhood Chain — tap one for live
            price, chart &amp; traders
          </div>
        </div>
      </div>

      {rollupStats.length > 0 && (
        <div className="summary-strip">
          {rollupStats.map((s) => (
            <div className="summary-stat" key={s.l}>
              <span className="summary-stat-label">{s.l}</span>
              <span className="summary-stat-value">{s.v}</span>
            </div>
          ))}
        </div>
      )}

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
          {stocks.slice(0, 120).map((t) => (
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
