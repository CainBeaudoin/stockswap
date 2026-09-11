(()=>{
  const $=s=>document.querySelector(s);
  const fmt=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:6});
  const money=n=>'$'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

  function renderRevealCard(p){
    const card=$('#stockCard2d');
    if(!card)return;
    card.dataset.rarity=p.rarity.name;
    $('#cardTicker').textContent=p.ticker;
    $('#cardCompany').textContent=stocks[p.ticker].name;
    $('#cardShares').textContent=`${fmt(p.shares)} shares`;
    $('#cardPrice').textContent=`${money(p.price)} / share`;
    $('#cardValue').textContent=money(p.value);
    $('#cardRarity').textContent=p.rarity.name;
  }

  closeReveal=()=>{
    pending=null;
    $('#reveal').className='reveal';
    const card=$('#stockCard2d');
    if(card)card.classList.remove('show');
    render();
  };

  $('#open').onclick=async()=>{
    if(state.balance<50)return toast('Not enough USDC');
    await refresh();
    state.balance-=50;
    wallet();
    pending=prize();
    const r=$('#reveal');
    const card=$('#stockCard2d');
    card?.classList.remove('show');
    r.dataset.rarity=pending.rarity.name;
    r.className='reveal on';
    $('#scan').textContent='COMMON';
    await new Promise(x=>setTimeout(x,250));
    r.classList.add('charge');
    for(const [i,l] of ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','RARE','EPIC'].entries()){
      await new Promise(x=>setTimeout(x,145+i*25));
      $('#scan').textContent=l;
      tone(180+i*60);
    }
    r.classList.remove('charge');
    r.classList.add('burst','final');
    $('#scan').textContent=pending.rarity.name.toUpperCase();
    [392,523,784,1047].slice(0,{Common:1,Uncommon:2,Rare:3,Epic:4,Legendary:4}[pending.rarity.name]).forEach((f,i)=>tone(f,.35,.04,i*.06));
    particles({Common:18,Uncommon:30,Rare:55,Epic:85,Legendary:130}[pending.rarity.name]);
    await new Promise(x=>setTimeout(x,420));
    renderRevealCard(pending);
    r.classList.add('card');
    requestAnimationFrame(()=>card?.classList.add('show'));
    $('#rr').textContent=pending.rarity.name;
    $('#rt').textContent=`${pending.ticker} · ${money(pending.value)}`;
    $('#rs').textContent=`${fmt(pending.shares)} shares at ${money(pending.price)}`;
  };
})();
