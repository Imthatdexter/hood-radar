-- Hood Radar: Top 50 wallets by realized PnL on Robinhood Chain (blockchain='robinhood').
-- Method: weighted-average-cost realized PnL over DEX swaps (dex.trades).
--   - Each swap -> buy leg (taker acquires token_bought, value=amount_usd) and
--     sell leg (taker disposes token_sold, value=amount_usd).
--   - Per (taker, token): cost_of_sold = (sold_qty / bought_qty) * bought_usd,
--     realized_pnl = sold_proceeds - cost_of_sold (average-cost basis).
--   - Tokens sold without a recorded DEX buy (airdrop / bridged-in) are dropped
--     via NULLIF (ambiguous cost -> conservative; avoids crediting bridge dumps).
--   - volume_usd = sum of amount_usd over buy legs = total DEX volume traded.
-- Scope: all on-chain DEX trades (chain launched ~2026-07, so history is short).
-- Refresh: ~every 6h on the free tier (PnL is slow-moving). Performance: large.

WITH legs AS (
    SELECT
        taker                  AS trader,
        token_bought_address   AS token,
        token_bought_amount    AS qty,
        amount_usd             AS usd,
        'buy'                  AS side
    FROM dex.trades
    WHERE blockchain = 'robinhood'
      AND taker IS NOT NULL
      AND token_bought_address IS NOT NULL
    UNION ALL
    SELECT
        taker,
        token_sold_address,
        token_sold_amount,
        amount_usd,
        'sell'
    FROM dex.trades
    WHERE blockchain = 'robinhood'
      AND taker IS NOT NULL
      AND token_sold_address IS NOT NULL
),
per_token AS (
    SELECT
        trader,
        token,
        SUM(CASE WHEN side = 'buy'  THEN qty ELSE 0 END) AS bought_qty,
        SUM(CASE WHEN side = 'buy'  THEN usd  ELSE 0 END) AS bought_usd,
        SUM(CASE WHEN side = 'sell' THEN qty ELSE 0 END) AS sold_qty,
        SUM(CASE WHEN side = 'sell' THEN usd  ELSE 0 END) AS sold_usd,
        SUM(CASE WHEN side = 'buy'  THEN 1   ELSE 0 END) AS buys
    FROM legs
    GROUP BY trader, token
),
pnl AS (
    SELECT
        trader,
        SUM(sold_usd - (sold_qty / NULLIF(bought_qty, 0)) * bought_usd) AS realized_pnl,
        SUM(bought_usd) AS volume_usd,
        SUM(buys)       AS swaps,
        COUNT(*)        AS tokens_traded
    FROM per_token
    GROUP BY trader
)
SELECT
    trader,
    ROUND(realized_pnl, 2) AS realized_pnl,
    ROUND(volume_usd, 2)   AS volume_usd,
    swaps,
    tokens_traded
FROM pnl
WHERE swaps >= 20                 -- filter one-off / noise wallets
ORDER BY realized_pnl DESC
LIMIT 50
