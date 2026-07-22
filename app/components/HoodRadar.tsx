'use client';

import { useState } from 'react';
import { fetchChain, fetchWallets } from '@/lib/api';
import { usePollingData } from '@/lib/usePollingData';
import { useWatchlist } from '@/lib/watchlist';
import ChainHeader from './ChainHeader';
import Leaderboard from './Leaderboard';
import Agents from './Agents';
import LiveFeed from './LiveFeed';
import Watchlist from './Watchlist';
import TokenExplorer from './TokenExplorer';
import WalletDetail from './WalletDetail';

type Tab = 'leaderboard' | 'agents' | 'feed' | 'watchlist' | 'tokens';

export default function HoodRadar() {
  const chain = usePollingData(fetchChain);
  const wallets = usePollingData(fetchWallets);
  const watch = useWatchlist();

  const [tab, setTab] = useState<Tab>('leaderboard');
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [focusSymbol, setFocusSymbol] = useState<string | null>(null);

  const explorerUrl = chain.data?.chain.explorerUrl;
  const tokens = chain.data?.tokens ?? [];
  const walletList = wallets.data?.wallets ?? null;

  const selectedWallet =
    walletList && selectedAddress
      ? walletList.find(
          (w) => w.address.toLowerCase() === selectedAddress.toLowerCase(),
        ) ?? null
      : null;

  const openWallet = (address: string) => setSelectedAddress(address);
  const openToken = (symbol: string) => {
    setFocusSymbol(symbol);
    setTab('tokens');
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'leaderboard', label: 'Leaderboard', count: walletList?.length },
    { key: 'agents', label: 'Agents' },
    { key: 'feed', label: 'Live Feed' },
    { key: 'watchlist', label: 'Watchlist', count: watch.list.length },
    { key: 'tokens', label: 'Tokens', count: tokens.length },
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

      <WalletDetail
        wallet={selectedWallet}
        explorerUrl={explorerUrl}
        onClose={() => setSelectedAddress(null)}
        isWatched={selectedAddress ? watch.has(selectedAddress) : false}
        onToggleWatch={watch.toggle}
      />
    </main>
  );
}
