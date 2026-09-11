# StockSwap

Interactive frontend prototype for a stock-pack experience with two primary views:

- **Packs** — spend a simulated USDC balance to open a $50 stock pack. The page is intentionally minimal: pack, odds and open action.
- **Portfolio** — aggregate fractional holdings by ticker, inspect an expanded stock chart, and partially or fully sell holdings back to simulated USDC.

## Run locally

Open `index.html` directly in a modern browser or serve the repository from any static web server. The prototype loads Three.js and TradingView Lightweight Charts from public CDNs.

## Current prototype behavior

- Starting simulated balance: **$1,000 USDC**
- Pack price: **$50 USDC**
- Displayed demo odds:
  - Common — 60% — $30–$45
  - Uncommon — 25% — $50–$75
  - Rare — 10% — $100–$180
  - Epic — 4% — $250–$500
  - Legendary — 1% — $1,000
- Pack opening uses an anticipation sequence with rarity scanning, escalating Web Audio sound design, particles and rarity-specific visual intensity.
- Revealed stock positions render as interactive **Three.js 3D cards**.
- A reveal can be kept in the portfolio or sold immediately to simulated USDC.
- Multiple wins in the same ticker are combined into one portfolio position.
- Portfolio trading is **sell-only**. There is no stock buy control.
- Holding rows open a dedicated detail screen with 1D / 1W / 1M / 3M / 1Y chart ranges, position stats and partial/MAX selling.
- Prices currently use an in-browser random walk purely to demonstrate live portfolio behavior.

## Production architecture

Replace the demo adapters with production services rather than placing API keys or execution logic in the browser:

1. **Market data service** — licensed real-time equities data for quotes, candles and charts.
2. **Token/asset registry** — stock-token metadata and contract mapping where applicable.
3. **Sell execution service** — request an executable quote server-side, disclose price/slippage/fees, then settle through the chosen stock-token or brokerage execution layer.
4. **Portfolio ledger** — authoritative balances, fills, cost basis and transaction history.
5. **USDC wallet/ledger** — custody or wallet abstraction appropriate to the product's jurisdiction and compliance model.
6. **Pack service** — auditable randomness, inventory controls, prize reservation, idempotent settlement and immutable event records.

## Important

This repository is a **UI/product prototype only**. It does not execute real securities trades, swaps, deposits, withdrawals or real-money pack purchases. The demo uses the displayed effective odds; it does not implement undisclosed outcome manipulation.