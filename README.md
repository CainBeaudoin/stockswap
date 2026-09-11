# StockSwap

Interactive prototype for a stock-pack experience with two views:

- **Packs** — spend a simulated USDC balance to open a $50 stock pack, watch the rarity reveal, then choose **Keep** or **Sell**.
- **Portfolio** — aggregate fractional holdings by ticker, inspect larger price charts, and sell a custom amount or use 25% / 50% / 75% / MAX shortcuts.

## Market data

Stock quotes and historical chart bars are now routed through server-side endpoints backed by **Yahoo Finance via RapidAPI**:

- `GET /api/quotes?symbols=AAPL,NVDA` → compact multi-symbol quote response.
- `GET /api/chart?symbol=AAPL&range=1D` → historical bars for the selected chart range.

The RapidAPI credential is never included in browser code. Both serverless functions read it from environment variables.

### Required environment variables

```bash
RAPIDAPI_KEY=your_rotated_key
RAPIDAPI_HOST=apidojo-yahoo-finance-v1.p.rapidapi.com
```

Use `.env.example` as the template. Do **not** commit `.env` or expose the key in `index.html`.

If deploying with Vercel, add `RAPIDAPI_KEY` and `RAPIDAPI_HOST` in the project's Environment Variables settings, then redeploy. The `/api` directory is designed as Vercel serverless functions.

## Current prototype behavior

- Starting simulated balance: **$1,000 USDC**
- Pack price: **$50 USDC**
- Common — 60% — $30–$45
- Uncommon — 25% — $50–$75
- Rare — 10% — $100–$180
- Epic — 4% — $250–$500
- Legendary — 1% — $1,000
- Pack opening uses rarity scanning, Web Audio sound design, particles and rarity-specific visual intensity.
- Revealed positions render as interactive **Three.js 3D cards**.
- Pack reveal actions are simply **Keep** and **Sell**.
- Multiple wins in the same ticker combine into one portfolio position.
- Portfolio is **sell-only**; there is no stock purchase control.
- Sell amount starts at **0**. Users can type a custom share amount or tap **25% / 50% / 75% / MAX**.
- Holding rows open a detailed stock screen with **1D / 1W / 1M / 3M / 1Y** chart ranges.
- Quotes refresh approximately every 15 seconds in the prototype.
- If the market-data endpoint is unavailable, the UI can continue displaying its seeded fallback values so the prototype remains testable.

## Execution is still simulated

The market-data integration only provides valuation/chart data. Clicking **Sell** currently updates the prototype's local USDC balance; it does **not** execute a real stock, stock-token, or brokerage transaction.

For production, the sell button should request an executable quote from the actual execution layer, display any spread/slippage/fees, settle the transaction, and only then credit the authoritative USDC balance.

## Deployment

Environment variables are configured in Vercel and this commit intentionally triggers a fresh deployment so the serverless market-data routes receive the latest environment configuration.

## Important

This repository is a UI/product prototype. It does not execute real securities trades, swaps, deposits, withdrawals, or real-money pack purchases. Paid pack mechanics and effective prize eligibility should be transparently disclosed and implemented with auditable backend rules.