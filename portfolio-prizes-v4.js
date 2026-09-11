(()=>{
  const root=document.querySelector('#potentialWins');
  if(!root)return;

  const examples=[
    {rarity:'Legendary',ticker:'NVDA',grail:true},
    {rarity:'Epic',ticker:'TSLA'},
    {rarity:'Rare',ticker:'META'},
    {rarity:'Uncommon',ticker:'AMZN'},
    {rarity:'Common',ticker:'AAPL'}
  ];

  const rgb=hex=>{const n=parseInt(hex.slice(1),16);return`${(n>>16)&255},${(n>>8)&255},${n&255}`};
  const localMoney=n=>'$'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const localFmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:4});

  function renderPotentialWins(){
    const odds=effectiveOdds();
    root.innerHTML=examples.map(({rarity,ticker,grail})=>{
      const tier=RARITIES.find(x=>x.name===rarity)||RARITIES[0];
      const live=odds.find(x=>x.name===rarity)||tier;
      const value=tier.max;
      const stock=STOCKS[ticker];
      const shares=value/(stock?.price||1);
      const oddsText=((live.odds||0)*100).toFixed((live.odds||0)<.01?2:1)+'%';
      return `<article class="potential-prize" style="--tier:${rgb(tier.color)}">
        <div class="tier-row"><span class="tier-name">${rarity}</span><span class="tier-odds">${oddsText}</span></div>
        ${grail?'<span class="grail-tag">GRAIL HIT</span>':''}
        <div class="ticker">${ticker}</div>
        <div class="company">${stock?.name||ticker}</div>
        <div class="win-value">${localMoney(value)}</div>
        <div class="win-label">possible position value</div>
        <div class="share-example"><b>${localFmt(shares)} shares</b> at ${localMoney(stock?.price||0)}</div>
      </article>`;
    }).join('');
  }

  function syncInlineApi(msg){
    const active=!!apiKey();
    const stateEl=document.querySelector('#apiInlineState');
    const input=document.querySelector('#apiInlineInput');
    if(!stateEl||!input)return;
    stateEl.classList.toggle('ok',active);
    stateEl.querySelector('span').textContent=msg||(active?'API key connected':'Using server configuration');
    if(active&&!input.value)input.value=apiKey();
  }

  const showBtn=document.querySelector('#apiInlineShow');
  const saveBtn=document.querySelector('#apiInlineSave');
  const clearBtn=document.querySelector('#apiInlineClear');
  const input=document.querySelector('#apiInlineInput');

  showBtn?.addEventListener('click',()=>{
    const showing=input.type==='text';
    input.type=showing?'password':'text';
    showBtn.textContent=showing?'Show':'Hide';
  });

  clearBtn?.addEventListener('click',()=>{
    sessionStorage.removeItem('stockswap_rapidapi_key');
    input.value='';
    syncInlineApi('Using server configuration');
    try{updateApiState('Using server configuration')}catch{}
    toast('Browser API key cleared');
  });

  saveBtn?.addEventListener('click',async()=>{
    const key=input.value.trim();
    if(!key)return toast('Paste an API key first');
    sessionStorage.setItem('stockswap_rapidapi_key',key);
    saveBtn.disabled=true;
    saveBtn.textContent='Testing…';
    syncInlineApi('Testing API key…');
    const ok=await refreshQuotes();
    saveBtn.disabled=false;
    saveBtn.textContent=ok?'Connected':'Try Again';
    syncInlineApi(ok?'API key connected':'API test failed');
    try{updateApiState(ok?'API key connected':'API test failed')}catch{}
    toast(ok?'Market data connected':'API key test failed');
    setTimeout(()=>{saveBtn.textContent='Save & Test'},1000);
  });

  const originalRenderPortfolio=renderPortfolio;
  renderPortfolio=function(){
    originalRenderPortfolio();
    renderPotentialWins();
    syncInlineApi();
  };

  renderPotentialWins();
  syncInlineApi();
})();

(()=>{
  if(document.querySelector('#samView'))return;

  const style=document.createElement('link');
  style.rel='stylesheet';
  style.href='/for-sam-v9.css?v=1';
  document.head.appendChild(style);

  const nav=document.querySelector('#nav');
  const main=document.querySelector('main');
  if(!nav||!main)return;

  const button=document.createElement('button');
  button.dataset.view='sam';
  button.textContent='For Sam';
  nav.appendChild(button);

  const section=document.createElement('section');
  section.className='view';
  section.id='samView';
  section.innerHTML=`
    <div class="sam-page">
      <div class="sam-hero">
        <div><small>ENGINEERING REFERENCE</small><h1>For Sam</h1><p>Market-data options and the Robinhood Stock Token pieces needed to move StockSwap from the current prototype into a production integration.</p></div>
        <div class="sam-date">Verified September 11, 2026</div>
      </div>

      <section class="sam-wide card">
        <div class="sam-section-title"><div><small>RECOMMENDED STACK</small><h2>Use each source for what it is best at</h2></div></div>
        <div class="sam-stack">
          <div><b>Robinhood /assets</b><span>Canonical Stock Token universe, contract addresses, logos, multipliers and trading capabilities.</span></div>
          <div><b>Robinhood /prices</b><span>Official underlying-equity bid/ask for Stock Tokens. Good for display and reconciliation.</span></div>
          <div><b>Massive</b><span>Primary production option for historical charts, aggregates, reference data, quotes and real-time market feeds.</span></div>
          <div><b>Chainlink on Robinhood Chain</b><span>Use the onchain multiplier-adjusted price feed when contracts need a settlement or valuation price.</span></div>
        </div>
      </section>

      <div class="sam-grid">
        <article class="sam-card card">
          <small>MARKET DATA</small><h2>Yahoo Finance via RapidAPI</h2>
          <span class="sam-badge good">Current prototype source</span>
          <p>Fastest path for the existing UI because StockSwap already proxies Yahoo Finance data through RapidAPI. Useful for quotes and charts during development.</p>
          <div class="sam-price"><b>Cost:</b> provider-dependent. RapidAPI supports free and freemium BASIC tiers plus paid plans and overages. Yahoo itself does not list a public Yahoo Finance API in its official developer API catalog.</div>
          <div class="sam-feature-list">
            <div class="sam-feature"><i></i><div><b>Best use</b><span>MVP quotes, chart history and development fallback.</span></div></div>
            <div class="sam-feature"><i></i><div><b>Current host</b><span>apidojo-yahoo-finance-v1.p.rapidapi.com</span></div></div>
            <div class="sam-feature"><i></i><div><b>Caution</b><span>Third-party provider dependency; plan limits and pricing can change.</span></div></div>
          </div>
          <div class="sam-links"><a href="https://docs.rapidapi.com/v2.0/docs/api-pricing" target="_blank" rel="noopener">RapidAPI pricing docs ↗</a><a href="https://developer.yahoo.com/api/" target="_blank" rel="noopener">Yahoo API catalog ↗</a></div>
        </article>

        <article class="sam-card card">
          <small>MARKET DATA</small><h2>Massive Stocks API</h2>
          <span class="sam-badge blue">Production candidate</span>
          <p>More purpose-built market-data stack for charts and live stock information. Provides reference tickers, aggregates, open/close, snapshots, trades, quotes and technical indicators.</p>
          <div class="sam-price"><b>Individual plans:</b> Basic Free · Starter $29/mo · Developer $79/mo · Advanced $199/mo.</div>
          <div class="sam-feature-list">
            <div class="sam-feature"><i></i><div><b>Reference</b><span>/v3/reference/tickers and ticker details.</span></div></div>
            <div class="sam-feature"><i></i><div><b>Charts</b><span>Aggregated OHLC bars and historical market data.</span></div></div>
            <div class="sam-feature"><i></i><div><b>Live data</b><span>Snapshots, trades and NBBO quotes on eligible plans.</span></div></div>
          </div>
          <div class="sam-links"><a href="https://massive.com/docs/rest/stocks/overview" target="_blank" rel="noopener">Massive Stocks docs ↗</a></div>
        </article>

        <article class="sam-card card">
          <small>ROBINHOOD CHAIN</small><h2>Official Stock Token API</h2>
          <span class="sam-badge gold">Source of truth for tokens</span>
          <p>Robinhood exposes read-only REST endpoints specifically for Stock Tokens. Use these to discover the supported token universe and reconcile token metadata with market prices.</p>
          <div class="sam-price"><b>Rate limit:</b> 60 requests/second. Endpoints are cached with endpoint-specific cache windows.</div>
          <div class="sam-feature-list">
            <div class="sam-feature"><i></i><div><b>/assets</b><span>Symbols, token names, chain deployments, contract addresses, logos, multipliers and tradability.</span></div></div>
            <div class="sam-feature"><i></i><div><b>/prices/{symbol}</b><span>Underlying-equity bid/ask, volume and halt status.</span></div></div>
            <div class="sam-feature"><i></i><div><b>/corporate-actions</b><span>Splits and other processed actions used to explain multiplier changes.</span></div></div>
          </div>
          <div class="sam-links"><a href="https://docs.robinhood.com/chain/stock-token-apis/" target="_blank" rel="noopener">Robinhood API docs ↗</a></div>
        </article>
      </div>

      <section class="sam-wide card">
        <div class="sam-section-title"><div><small>ROBINHOOD STOCK TOKENS</small><h2>What Sam needs to account for</h2><p>These are not ordinary database shares. The product should model the actual token semantics.</p></div></div>
        <div class="sam-rh-grid">
          <div class="sam-endpoints">
            <div class="sam-endpoint"><code>GET https://api.robinhood.com/rhj/assets</code><span>Use as the canonical token list. Pull tokenSymbol, tokenName, deployments[].contractAddress, chainId, logoUrl, currentMultiplier and tradingCapabilities.</span></div>
            <div class="sam-endpoint"><code>GET https://api.robinhood.com/rhj/prices/AAPL</code><span>Returns raw underlying-equity bid/ask. Robinhood says these REST prices are not multiplier-adjusted.</span></div>
            <div class="sam-endpoint"><code>GET https://api.robinhood.com/rhj/corporate-actions</code><span>Reconcile splits and other corporate actions that change the token's shares-per-token multiplier.</span></div>
          </div>
          <div>
            <div class="sam-facts">
              <div class="sam-fact"><small>CHAIN ID</small><b>4663</b><span>Robinhood Chain deployment identifier shown in the Stock Token API.</span></div>
              <div class="sam-fact"><small>TOKEN STANDARD</small><b>ERC-20 · 18 decimals</b><span>Works with normal EVM wallets and libraries.</span></div>
              <div class="sam-fact"><small>PRICE FEED</small><b>Chainlink</b><span>Per-asset onchain feeds are multiplier-adjusted for contract use.</span></div>
              <div class="sam-fact"><small>MULTIPLIER</small><b>currentMultiplier</b><span>Shares-per-token changes for corporate actions while raw token balance can remain unchanged.</span></div>
            </div>
            <div class="sam-warning"><b>Legal/product wording:</b> Robinhood describes Stock Tokens as tokenised debt securities issued by Robinhood Assets (Jersey) Limited that provide economic exposure to the underlying security. They do not give the holder legal or beneficial rights in the underlying shares. Eligibility and jurisdiction restrictions need to be enforced before production.</div>
            <div class="sam-links"><a href="https://docs.robinhood.com/chain/stock-tokens/" target="_blank" rel="noopener">Stock Token overview ↗</a><a href="https://docs.robinhood.com/chain/contracts/" target="_blank" rel="noopener">Canonical contracts ↗</a></div>
          </div>
        </div>
      </section>

      <section class="sam-wide card">
        <div class="sam-section-title"><div><small>IMPLEMENTATION ORDER</small><h2>Suggested handoff</h2></div></div>
        <div class="sam-todo">
          <div><b>1. Token discovery</b><span>Replace hard-coded stock symbols with Robinhood /assets, filtered to active and tradable Stock Tokens.</span></div>
          <div><b>2. Token identity</b><span>Store Robinhood contract address + chainId with every position so ticker spoofing cannot create a fake Stock Token.</span></div>
          <div><b>3. Market-data layer</b><span>Keep RapidAPI/Yahoo for development; evaluate Massive as the production chart/history provider.</span></div>
          <div><b>4. Pricing semantics</b><span>Use Robinhood REST for display/reconciliation and Chainlink for onchain contract valuation. Never mix raw and multiplier-adjusted prices without currentMultiplier.</span></div>
          <div><b>5. Portfolio balances</b><span>Replace the simulated holdings ledger with wallet/token balances from Robinhood Chain when custody architecture is ready.</span></div>
          <div><b>6. Trading checks</b><span>Read tradingCapabilities and halt state before offering a sell/open flow for a specific Stock Token.</span></div>
          <div><b>7. Corporate actions</b><span>Sync currentMultiplier and corporate actions so splits do not break displayed share quantities or valuation.</span></div>
          <div><b>8. Compliance</b><span>Add eligibility, KYC/geofencing and jurisdiction rules before any real-money Stock Token flow is enabled.</span></div>
        </div>
      </section>
    </div>`;
  main.appendChild(section);

  button.onclick=()=>{
    renderNav('sam');
    window.scrollTo({top:0,behavior:'smooth'});
  };
})();