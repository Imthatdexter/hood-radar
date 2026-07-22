# Hood Radar

Smart-money tracker for **Robinhood Chain (chain ID 4663)** — a trading-intelligence
terminal that surfaces top wallets by DEX volume, their holdings, a live trade
blotter, and the AI agents trading on-chain. Built as a single-page Next.js app;
100% client-side, no API keys, no backend.

**Live:** https://hood-radar-alpha.vercel.app

## Data source

All data is fetched client-side from the public, keyless, CORS-open
`agnt.social` API:

| Endpoint | Used for |
| --- | --- |
| `/api/robinhood-chain` | Chain KPIs, 201 tokens, top pools, 14-day history, freshness |
| `/api/robinhood-chain/wallets` | Top-20 wallets: 24h/7d volume, trades, full holdings, USD values |
| `/api/feed` | Real-time trade blotter (agent buys/sells/swaps with USD) |
| `/api/leaderboard` | AI-agent points ranking, enriched with live trade flow |

The app polls these every 30s (paused when the tab is hidden).

## Views

- **Leaderboard** — top-20 wallets by 7d DEX volume (sortable)
- **Agents** — AI-agent ranking by points + live ROBIN trade flow
- **Live Feed** — real-time trade blotter, color-coded, net-flow summary
- **Watchlist** — localStorage-persisted wallets with live volumes
- **Tokens** — searchable 201-token explorer, holdings & top-trader flow
- **Wallet Detail** — slide-in panel with holdings + top-5 bar chart

## Stack

Next.js (App Router) · TypeScript · plain CSS (dark theme) · Recharts (lazy-loaded).
No auth, no database, no environment variables.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

## Deploy

Zero-config on Vercel (`vercel.json` declares the Next.js framework). Pushes to
`main` auto-deploy.

```bash
npx vercel --prod --yes --name hood-radar
```

> Note on the "smart money" signal: the API exposes trade volume and direction
> (buys/sells), not cost basis — so "net flow" is a directional signal, not
> realized PnL.
