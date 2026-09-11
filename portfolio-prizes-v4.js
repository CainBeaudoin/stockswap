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

  const originalRenderPortfolio=renderPortfolio;
  renderPortfolio=function(){
    originalRenderPortfolio();
    renderPotentialWins();
  };

  renderPotentialWins();
})();