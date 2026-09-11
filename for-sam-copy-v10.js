(()=>{
  const sam=document.querySelector('#samView');
  const hero=sam?.querySelector('.sam-hero');
  if(!sam||!hero||document.querySelector('#samCopy'))return;

  const prompt=`You are an AI engineering and research agent helping us improve StockSwap, a stock-pack product being designed for Robinhood Chain Stock Tokens. Use the product context below as a starting point, then independently research the latest primary documentation before making recommendations. Do not assume any price, API limit, contract address, availability, legal status, or provider feature is still current without verifying it.

PRODUCT SUMMARY

1. PACKS TAB
- Users open randomized stock packs containing fractional stock positions.
- A user can choose 1 to 10 packs with a slider.
- Multi-pack openings reveal one stock card at a time, like opening physical trading cards, then show a centered final grid with every result and the total value won.
- 5 to 9 packs guarantee at least one Uncommon-or-better result if the natural batch would otherwise miss that floor.
- 10 packs guarantee at least one Rare-or-better result if the natural batch would otherwise miss that floor. Natural Epic or Legendary results are never downgraded or replaced.
- The guarantee should be transparent and deterministic, not hidden outcome manipulation.
- The current prototype uses rarity tiers, inventory-aware odds, a commit/reveal-style proof concept, quote locking, slippage protection, refunds, Keep/Sell decisions, and a Possible Hits section.
- The user-facing experience should stay simple even if the infrastructure underneath is sophisticated.

2. PORTFOLIO TAB
- Shows total account value, stock value, and USDC balance.
- Shows an overall portfolio-performance chart with 1D, 7D, 30D, 3M, 1Y, and All ranges.
- Shows fractional stock holdings.
- Clicking a holding opens a dedicated stock-only subpage so the account overview, portfolio chart, holdings list, and API input are hidden while inspecting that stock.
- The stock detail page shows the stock chart, position statistics, and Sell controls only.
- There is no Withdraw or List flow in the current product UI.
- A RapidAPI key field is intentionally placed at the bottom of Portfolio for development/testing and should not shape the production UI.

3. FOR SAM TAB / CURRENT DATA RESEARCH
- Current prototype market data: Yahoo Finance data through the third-party RapidAPI host apidojo-yahoo-finance-v1.p.rapidapi.com.
- Do not call this an official Yahoo Finance developer API. Verify the current RapidAPI provider, pricing, limits, licensing, and reliability.
- Production market-data candidate: Massive Stocks API for historical aggregates/charts, reference data, snapshots, trades, quotes, WebSockets, and other market data. Verify its current plans, entitlements, latency, exchange coverage, rate limits, redistribution rules, and real-time licensing.
- Robinhood should be researched as the canonical source for Robinhood Chain Stock Token identity and metadata.
- Existing research points to Robinhood Stock Token endpoints such as /rhj/assets, /rhj/prices/{symbol}, and /rhj/corporate-actions. Verify the current official endpoints and schemas.
- Existing research points to Robinhood Chain ID 4663, ERC-20 Stock Tokens with 18 decimals, currentMultiplier for shares-per-token semantics, and Chainlink feeds for onchain valuation. Verify every one of these facts in current Robinhood/Chainlink docs before implementation.
- Robinhood Stock Tokens should not be described as legal ownership of underlying shares. Verify the current legal/product description, jurisdiction restrictions, transfer rules, and eligibility requirements.

WHAT YOU SHOULD RESEARCH

A. MARKET-DATA PROVIDERS
Compare the best realistic data providers for this product, including at minimum the current RapidAPI/Yahoo approach and Massive. Add other strong candidates only if they materially improve the architecture.
For each provider research:
- real-time vs delayed quotes
- historical depth and granularity
- WebSocket availability
- snapshots, trades, NBBO/quotes, aggregates and corporate actions
- request limits and concurrency
- current pricing and enterprise requirements
- commercial display/redistribution rights
- reliability/SLA and production suitability
- symbol mapping and corporate-action handling
- how well it maps to Robinhood Stock Tokens
Recommend which source should power UI prices, charts, portfolio history, valuation, and fallback data.

B. ROBINHOOD CHAIN / STOCK TOKENS
Using official Robinhood documentation first, research:
- canonical Stock Token discovery
- token symbols, underlying symbols, contract addresses and chain deployments
- tradingCapabilities or equivalent availability fields
- contract verification and anti-spoofing strategy
- currentMultiplier and corporate actions
- raw underlying price vs multiplier-adjusted token price
- Chainlink feeds and how contracts should consume them
- wallet balances and token decimals
- custody architecture options
- transfers, settlement and any restrictions
- practical ways a user could receive, hold, sell, or redeem economic exposure
- DEX/liquidity routes actually available on Robinhood Chain
- USDC/USDG or other settlement assets actually supported
- KYC, sanctions, geofencing and eligibility constraints
- failure states such as halts, stale prices, suspended assets or corporate actions

C. PACK ENGINE / ECONOMICS
Research and design a production-safe pack engine covering:
- verifiable randomness / commit-reveal or VRF alternatives
- how guarantees such as 5 = Uncommon+ and 10 = Rare+ affect expected value and house margin
- how to make guarantees deterministic and independently verifiable
- RTP/EV modeling by pack count
- inventory-aware odds without misleading users
- reserve/liquidity requirements for instant Sell
- quote locking and slippage protection
- timeout/refund behavior
- preventing race conditions, replay, double settlement, manipulated client state and inventory exhaustion
- how to show accurate odds and guarantee disclosures to users

D. PORTFOLIO ACCOUNTING
Research how the portfolio should calculate performance correctly once real money is involved:
- total account value
- cash vs Stock Token value
- realized and unrealized P&L
- average cost basis
- treatment of pack purchases and instant sells
- deposits/withdrawals and cash flows
- 1D / 7D / 30D / 3M / 1Y / All performance
- whether time-weighted return, money-weighted return, or simple account-value movement is most appropriate for the UX
- historical reconstruction when holdings change during the selected period
- handling splits and multiplier changes

E. SECURITY / INFRASTRUCTURE
Research a production architecture that minimizes exploit risk:
- server-authoritative settlement
- wallet and signing-key isolation
- treasury/custody controls
- contract permissions
- oracle validation and stale-price checks
- idempotency
- nonce/replay protection
- rate limiting and abuse protection
- transaction reconciliation
- monitoring and alerting
- inventory/reserve invariants
- incident shutdown/maintenance controls
- audit requirements and test strategy

OUTPUT I WANT
1. Executive recommendation: the best production architecture and why.
2. Source-of-truth matrix: which system owns token identity, price display, charts, onchain valuation, balances, settlement, corporate actions and portfolio history.
3. API comparison table with verified current pricing/limits/licensing notes and links to primary docs.
4. Robinhood Chain integration map with verified endpoints/contracts/feeds and any unknowns clearly marked.
5. Proposed backend services and data model.
6. Pack-opening state machine from quote -> commitment -> reveal -> guarantee logic -> inventory reservation -> Keep/Sell -> settlement/refund.
7. Portfolio accounting methodology.
8. Security and exploit-prevention checklist.
9. Compliance/eligibility questions that require legal review; do not invent legal conclusions.
10. Phased implementation plan: prototype, testnet/staging, limited production, full production.
11. Concrete code-level recommendations or pseudocode where useful.
12. A final list of unresolved questions we need to answer before real-money launch.

RESEARCH RULES
- Prefer official Robinhood, Chainlink, exchange/data-provider, and primary vendor documentation.
- Verify freshness and publication/update dates.
- Cite primary sources next to material claims.
- Clearly separate verified facts, reasonable engineering recommendations, assumptions, and unknowns.
- Do not blindly copy competitor mechanics; identify why each mechanism exists and whether StockSwap actually needs it.
- Do not treat the current prototype's simulated balances, inventory, liquidity, randomness, or settlement as production-ready infrastructure.
- If documentation conflicts, call out the conflict rather than guessing.
- Optimize for a simple consumer UX with auditable, secure infrastructure underneath.`;

  const actions=document.createElement('div');
  actions.className='sam-copy-actions';
  actions.innerHTML=`<button id="samCopy" type="button">Copy</button><span>Copy a complete AI research brief</span>`;

  const promptBox=document.createElement('section');
  promptBox.className='sam-ai-prompt card hidden';
  promptBox.id='samAiPrompt';
  promptBox.innerHTML=`<div class="sam-ai-prompt-head"><div><small>AI HANDOFF</small><h2>Research brief copied for your AI agent</h2></div><button id="samPromptClose" type="button" aria-label="Hide prompt">×</button></div><pre></pre>`;
  promptBox.querySelector('pre').textContent=prompt;

  hero.appendChild(actions);
  hero.insertAdjacentElement('afterend',promptBox);

  const copyButton=actions.querySelector('#samCopy');
  const closeButton=promptBox.querySelector('#samPromptClose');

  async function copyPrompt(){
    let copied=false;
    try{
      await navigator.clipboard.writeText(prompt);
      copied=true;
    }catch{
      const area=document.createElement('textarea');
      area.value=prompt;
      area.style.position='fixed';
      area.style.opacity='0';
      document.body.appendChild(area);
      area.focus();
      area.select();
      try{copied=document.execCommand('copy')}catch{}
      area.remove();
    }
    promptBox.classList.remove('hidden');
    copyButton.textContent=copied?'Copied':'Copy';
    if(typeof toast==='function')toast(copied?'AI research brief copied':'Research brief opened below');
    setTimeout(()=>{copyButton.textContent='Copy'},1500);
  }

  copyButton.addEventListener('click',copyPrompt);
  closeButton.addEventListener('click',()=>promptBox.classList.add('hidden'));
})();
