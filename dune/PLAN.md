# Dune-backed PnL Leaderboard — Plan

Goal: rank the **top 50 wallets on Robinhood Chain by realized PnL**, chain-wide.
This replaces the volume-based ranking with true profitability.

## Why Dune
`agnt.social` exposes no PnL data and can't enumerate wallets (see
`unavailableMetrics` — "Daily active addresses without custom indexing"). Dune
indexes Robinhood Chain (EVM/Arbitrum L2) with decoded `dex.trades`, and each
swap row already carries `amount_usd` at trade time — enough to compute cost
basis and realized PnL without a separate price feed.

## Architecture
- **`dune/realized_pnl.sql`** — the query (created in the Dune account, executed
  on a schedule).
- **`app/api/pnl/route.ts`** — serverless Route Handler. Reads `DUNE_API_KEY`
  from env, calls Dune's *latest results* endpoint for the query, caches for a
  few minutes, returns JSON. Keeps the key server-side (never shipped to client).
- **`app/components/PnlLeaderboard.tsx`** — new "Top by PnL" tab. Polls
  `/api/pnl` (~every 60s client-side for responsiveness); the **underlying Dune
  result refreshes ~every 6h on the free tier** (PnL is slow-moving; UI shows
  "updated Xh ago"). Faster refresh (hourly+) requires a paid plan.
- Env var: `DUNE_API_KEY` (Vercel + local `.env.local`).

## PnL method
Average-cost-basis realized PnL over `dex.trades` per `(trader, token)`:
1. Expand each swap into a buy leg (acquire `token_bought`, cost = `amount_usd`)
   and a sell leg (dispose `token_sold`, proceeds = `amount_usd`).
2. Walk events per `(trader, token)` in time order, maintaining running avg cost.
3. On each sell: `realized_pnl += proceeds − avg_cost * qty_sold`.
4. Sum across tokens per trader → rank top 50.

Scope: DEX swaps only (the vast majority of on-chain trading). **Validated
against known wallets before going live** (e.g., the agnt top-volume wallets
should show plausible PnL, not nonsense).

## Setup steps
1. Create Dune account → Settings → API → API key.
2. `npx vercel env add DUNE_API_KEY production` (and add to local `.env.local`).
3. Create the query in Dune from `dune/realized_pnl.sql`, note its query ID.
4. Schedule execution (~10 min) OR trigger via the execute endpoint from the
   route on cache miss.
5. Wire `DUNE_QUERY_ID` + build the route + tab; deploy.

## Cost note (free vs paid)
Free Community tier = **2,500 credits/month**. A chain-wide PnL query is a
**Large** execution (~20 credits/run), so free covers ~120 runs/month ≈ **every
6 hours**. Result export is negligible (~0.5 credits/read), and server-side
caching means user traffic doesn't multiply cost. PnL changes slowly, so 6-hour
freshness is fine — **start free**. Upgrade to Plus only if you want hourly+
refresh or exceed the monthly credits (overage: $5 / 100 credits). Watch
`execution_cost_credits` on the status endpoint to confirm.
