'use client';

import { useEffect, useState } from 'react';
import { fetchChain, fetchWallets } from '@/lib/api';
import type { PnlApiResponse } from '@/lib/types';
import { usePollingData } from '@/lib/usePollingData';
import { useWatchlist } from '@/lib/watchlist';
import ChainHeader from './ChainHeader';
import PnlLeaderboard from './PnlLeaderboard';
import Leaderboard from './Leaderboard';
import Agents from './Agents';
import LiveFeed from './LiveFeed';
import Watchlist from './Watchlist';
import TokenExplorer from './TokenExplorer';
import StocksView from './StocksView';
import WalletDetail from './WalletDetail';

type Tab = 'pnl' | 'leaderboard' | 'agents' | 'feed' | 'watchlist' | 'tokens' | 'stocks';

async function fetchPnl(): Promise<PnlApiResponse> {
  const r = await fetch('/api/pnl', { cache: 'no-store' });
  return (await r.json()) as PnlApiResponse;
}

export default function HoodRadar() {
  const chain = usePollingData(fetchChain);
  const wallets = usePollingData(fetchWallets);
  const pnl = usePollingData<PnlApiResponse>(fetchPnl, { intervalMs: 60000 });
  const watch = useWatchlist();

  const [tab, setTab] = useState<Tab>('pnl');
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [focusSymbol, setFocusSymbol] = useState<string | null>(null);

  // Deep links: read ?tab/?w/?t on load, then keep the URL in sync so any
  // wallet/token/tab is shareable.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tb = p.get('tab');
    const w = p.get('w');
    const t = p.get('t');
    if (tb) setTab(tb as Tab);
    if (w) setSelectedAddress(w);
    if (t) {
      setFocusSymbol(t);
      setTab('tokens');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (tab !== 'pnl') p.set('tab', tab);
    if (selectedAddress) p.set('w', selectedAddress);
    if (focusSymbol && tab === 'tokens') p.set('t', focusSymbol);
    const qs = p.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, '', url);
  }, [tab, selectedAddress, focusSymbol]);

  const explorerUrl = chain.data?.chain.explorerUrl;
  const tokens = chain.data?.tokens ?? [];
  const walletList = wallets.data?.wallets ?? null;
  const pnlRows = pnl.data?.rows ?? [];
  const stockCount = tokens.filter((t) => /stock|etf/i.test(t.category || '')).length;

  const lc = (a: string) => a.toLowerCase();
  const selectedWallet =
    walletList && selectedAddress
      ? walletList.find((w) => lc(w.address) === lc(selectedAddress)) ?? null
      : null;
  const selectedPnl = selectedAddress
    ? pnlRows.find((r) => lc(r.trader) === lc(selectedAddress)) ?? null
    : null;

  const openWallet = (address: string) => setSelectedAddress(address);
  const openToken = (symbol: string) => {
    setFocusSymbol(symbol);
    setTab('tokens');
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'pnl', label: 'Top Wallets by PnL' },
    { key: 'leaderboard', label: 'Leaderboard', count: walletList?.length },
    { key: 'agents', label: 'Agents' },
    { key: 'feed', label: 'Live Feed' },
    { key: 'watchlist', label: 'Watchlist', count: watch.list.length },
    { key: 'tokens', label: 'Tokens', count: tokens.length },
    { key: 'stocks', label: 'Stocks', count: stockCount },
  ];

  return (
    <main className="app">
      <div className="brand-row">
        <div className="brand">
          <div className="brand-mark">⬢</div>
          <div>
            <div className="brand-title">Hood Radar</div>
            <div className="brand-sub">Smart money on Robinhood Chain</div>
          </div>
        </div>
        <span className="chain-tag">chain 4663 · {explorerUrl ? 'connected' : '…'}</span>
      </div>

      <ChainHeader
        chainData={chain.data}
        error={chain.error}
        loading={chain.loading}
      />

      <nav className="nav">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`nav-btn ${tab === t.key ? 'nav-btn--active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.count != null && <span className="nav-count">{t.count}</span>}
          </button>
        ))}
      </nav>

      {tab === 'pnl' && (
        <PnlLeaderboard
          rows={pnlRows}
          loading={pnl.loading}
          configured={pnl.data?.configured ?? !pnl.loading}
          error={pnl.data?.error}
          generatedAt={pnl.data?.generatedAt}
          explorerUrl={explorerUrl}
          onSelect={openWallet}
        />
      )}
      {tab === 'leaderboard' && (
        <Leaderboard
          wallets={walletList}
          error={wallets.error}
          loading={wallets.loading}
          explorerUrl={explorerUrl}
          onSelect={openWallet}
          watched={watch.has}
        />
      )}
      {tab === 'agents' && <Agents />}
      {tab === 'feed' && (
        <LiveFeed explorerUrl={explorerUrl} onSelectToken={openToken} />
      )}
      {tab === 'watchlist' && (
        <Watchlist
          watched={watch.list}
          wallets={walletList}
          pnlRows={pnlRows}
          explorerUrl={explorerUrl}
          loading={wallets.loading}
          onSelect={openWallet}
          onRemove={watch.remove}
        />
      )}
      {tab === 'tokens' && (
        <TokenExplorer
          tokens={tokens}
          wallets={walletList}
          explorerUrl={explorerUrl}
          onSelectWallet={openWallet}
          focusSymbol={focusSymbol}
        />
      )}
      {tab === 'stocks' && (
        <StocksView
          tokens={tokens}
          explorerUrl={explorerUrl}
          onSelectToken={openToken}
        />
      )}

      <WalletDetail
        address={selectedAddress}
        wallet={selectedWallet}
        pnl={selectedPnl}
        explorerUrl={explorerUrl}
        onClose={() => setSelectedAddress(null)}
        isWatched={selectedAddress ? watch.has(selectedAddress) : false}
        onToggleWatch={watch.toggle}
      />
    </main>
  );
}
