# StockSwap

Interactive frontend prototype for a stock-pack experience with two primary views:

- **Packs** — spend a simulated USDC balance to open a $50 market pack, reveal a fractional stock position, then keep it or immediately sell it back to USDC.
- **Portfolio** — aggregate fractional holdings by ticker, watch simulated live price movement, and partially or fully buy/sell positions.

## Run locally

No build step or dependencies are required. Open `index.html` directly in a browser or serve the repository with any static file server.

## Prototype behavior

- Starting balance: **$1,000 USDC**
- Pack price: **$50 USDC**
- Demo prize range: **$30–$1,000**
- Tracked demo tickers: AAPL, NVDA, TSLA, AMZN, MSFT, META, GOOGL
- Fractional shares are calculated from the revealed dollar value and current demo price.
- Multiple wins in the same ticker are combined into one portfolio position.
- Buy/sell controls support percentage shortcuts and MAX.
- Prices use an in-browser random walk purely to demonstrate live portfolio behavior.

## Prize-gating note

The prototype intentionally uses a **visible inventory eligibility meter** for the Grail tier. It does not implement hidden manipulation of paid outcomes. In a production product, effective odds, inventory gates, prize eligibility and settlement rules should be clearly disclosed and auditable.

## Suggested production architecture

Replace the demo adapters with production services rather than putting API keys or execution logic in the browser:

1. **Market data service** — Massive/Polygon WebSocket or another licensed real-time equities feed for quotes, candles and charts.
2. **Token/asset registry** — Robinhood Chain stock-token asset metadata where applicable.
3. **Execution service** — server-side quote + swap/order adapter. The UI should always show the executable quote, slippage and fees before confirmation.
4. **Portfolio ledger** — authoritative backend/onchain balances, fills, cost basis and transaction history.
5. **USDC wallet/ledger** — custody or wallet abstraction appropriate to the product's jurisdiction and compliance model.
6. **Pack service** — auditable randomness/inventory logic, prize reservation, idempotent settlement and immutable event records.

## Important

This repository currently contains a **UI/product prototype only**. It does not execute real securities trades, swaps, deposits, withdrawals or real-money pack purchases.