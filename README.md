# StockSwap

StockSwap is now a broader **stock-pack protocol prototype** rather than only a pack-opening UI. The consumer experience stays simple, but the repo now models the deeper systems needed for inventory-aware stock packs, liquidity-backed sells, transparent randomness, settlement controls, and protocol operations.

## Main product surfaces

- **Packs** — dynamic pack pricing, disclosed inventory-aware odds, 1 / 5 / 10 batch opens, quote locking, commit/reveal fairness flow, Keep / Sell settlement.
- **Portfolio** — aggregated fractional positions, live/fallback charts, custom sell amount, 25% / 50% / 75% / MAX shortcuts, liquidity-backed sell checks, simulated withdraw/list flows.
- **Activity & Proof** — commitment hashes, simulated future-block seed, revealed server seed, nonce, reveal hash, settlement state, refunds, and one-click proof recomputation.
- **Liquidity** — pre-funded USDC reserve, stock inventory ledger, inventory remaining, backing balances, simulated LP deposits, and fee accumulation.
- **Admin** — protocol margin, sell fee, max quote drift, settlement timeout, automatic refunds, inventory-aware odds, maintenance mode, revenue metrics, and production-adapter status.

## Mechanics implemented in the prototype

### Provably fair structure

Each opening creates a SHA-256 commitment from a secret server seed + nonce before the reveal. The prototype then derives the result from that seed plus a simulated future-block identifier and exposes everything needed to recompute the commitment/reveal hashes afterward.

**Important:** the future block is simulated in-browser. Production should source the reveal entropy from Robinhood Chain or another auditable onchain randomness mechanism.

### Inventory-aware odds

Odds are shown to the user and can dynamically adjust as available inventory changes. They are never secretly changed after a pack is purchased. Admin can disable inventory reweighting to use the base rarity distribution.

### Dynamic pricing

The pack price is derived from the current expected prize value and the configured protocol margin instead of being a permanently hard-coded price.

### Fractional stock positions

Pack prizes are valued in dollars and converted into fractional shares using the locked market price at opening.

### Quote/slippage protection

The market quote is locked when the user presses Open. The prototype includes a maximum quote-drift control and automatic refund path when settlement conditions fail.

### Timeout/refund states

Pack settlement includes committed, revealed, settled and refunded behavior. Admin can configure a settlement timeout and automatic stale-pack refunds.

### Batch opening

Users can open 1, 5 or 10 packs in one flow.

### Liquidity-backed instant sell

Instant sells are checked against a protocol USDC reserve. Portfolio sells and sell-on-reveal reduce the reserve and accrue configurable fees.

### LP / inventory system

The Liquidity page models stock inventory deposits plus USDC backing, inventory depletion, and fee generation. It is intentionally a simulation until token custody/contracts are connected.

### Activity / audit trail

The app records pack opens, refunds, portfolio sells, listings, withdrawal requests and LP deposits. Pack events expose their fairness proof data.

### No protocol token in V1

A rewards/emissions token is deliberately **not** implemented. The Admin architecture view marks this as disabled by design.

## Market data

Quotes and historical chart bars continue to use the existing server-side Yahoo Finance / RapidAPI proxy:

- `GET /api/quotes?symbols=AAPL,NVDA`
- `GET /api/chart?symbol=AAPL&range=1D`

Environment variables:

```bash
RAPIDAPI_KEY=your_rotated_key
RAPIDAPI_HOST=apidojo-yahoo-finance-v1.p.rapidapi.com
```

For easy testing, a RapidAPI key can also be entered from the Packs page API control. A browser-entered key is stored only in `sessionStorage` and forwarded to the same-origin serverless proxy.

## Production adapters still required

This repo intentionally does **not** pretend the following are live when they are not:

1. **Robinhood Chain stock-token custody / balances** — replace the browser inventory ledger with canonical token balances and contracts.
2. **Onchain randomness** — replace the simulated future-block identifier with auditable chain entropy / VRF-style settlement.
3. **Execution / routing** — replace the simulated USDC reserve with real executable market-maker / DEX quotes and settlement.
4. **Authentication / authoritative database** — move balances, positions, commitments, proofs, inventory and activity out of browser storage.
5. **Compliance / geofencing / KYC / sanctions controls** — required before any real-money tokenized-securities flow.
6. **Custody, reconciliation, failure recovery and security hardening** — required before production use.

## Important

This remains a **product and protocol simulation**. It does not execute real securities trades, swaps, deposits, withdrawals, token transfers, or real-money pack purchases. User-facing odds are disclosed, and the prototype does not implement hidden outcome manipulation.