(()=>{
  const batchRoot=document.querySelector('#batch');
  if(!batchRoot)return;

  const existingCount=Math.max(1,Math.min(10,Number(state.batchCount)||1));
  state.batchCount=existingCount;
  batchRoot.className='batch-slider';
  batchRoot.innerHTML=`
    <div class="batch-slider-head"><span>Packs to open</span><b id="packCountValue">${existingCount}</b></div>
    <input id="packCountSlider" type="range" min="1" max="10" step="1" value="${existingCount}" aria-label="Number of packs to open" />
    <div class="batch-slider-scale"><span>1</span><span>10</span></div>`;

  const slider=document.querySelector('#packCountSlider');
  const valueEl=document.querySelector('#packCountValue');
  const syncCount=value=>{
    const count=Math.max(1,Math.min(10,Number(value)||1));
    state.batchCount=count;
    slider.value=String(count);
    valueEl.textContent=String(count);
    save();
    renderPacks();
  };
  slider.addEventListener('input',e=>syncCount(e.target.value));

  // Portfolio is sell-only. Keep legacy nodes mounted for the V2 renderer, but remove them from the product surface and disable their handlers.
  const listingMetric=document.querySelector('#listingCount')?.closest('.metric');
  if(listingMetric)listingMetric.classList.add('legacy-hidden');
  const secondaryActions=document.querySelector('.secondary-actions');
  if(secondaryActions)secondaryActions.classList.add('legacy-hidden');
  ['withdrawButton','listButton'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.onclick=null;el.disabled=true;el.setAttribute('aria-hidden','true');}
  });

  const actions=document.querySelector('#revealActions');
  const verifyButton=document.querySelector('#verifyReveal');
  const nextButton=document.createElement('button');
  nextButton.type='button';
  nextButton.id='nextReveal';
  nextButton.className='primary hidden';
  nextButton.textContent='Next card';
  actions.insertBefore(nextButton,verifyButton);

  let revealIndex=0;

  function setActionVisibility(total,isLast){
    const single=total===1;
    document.querySelector('#keepReveal').classList.toggle('hidden',!single);
    document.querySelector('#sellReveal').classList.toggle('hidden',!single);
    document.querySelector('#keepAllReveal').classList.toggle('hidden',single||!isLast);
    document.querySelector('#sellAllReveal').classList.toggle('hidden',single||!isLast);
    nextButton.classList.toggle('hidden',single||isLast);
  }

  function showSequentialPrize(index){
    const pending=state.pending;
    if(!pending?.prizes?.length)return;
    const total=pending.prizes.length;
    const prize=pending.prizes[index];
    const rarity=RARITIES.find(r=>r.name===prize.rarity)||RARITIES[0];
    const results=document.querySelector('#revealResults');

    results.classList.add('sequential');
    results.innerHTML=renderPrizeCard(prize);
    const card=results.querySelector('.prize-card');
    card?.classList.add('deal-in');

    document.querySelector('#scanText').textContent=total===1
      ? `${prize.rarity.toUpperCase()} · ${prize.ticker}`
      : `CARD ${index+1} OF ${total} · ${prize.rarity.toUpperCase()} · ${prize.ticker}`;

    particles(total===1?45:32,rarity.color);
    tone(480+index*34,.16,.03);
    actions.classList.remove('hidden');
    setActionVisibility(total,index===total-1);
  }

  nextButton.onclick=async()=>{
    const pending=state.pending;
    if(!pending?.prizes?.length)return;
    const card=document.querySelector('#revealResults .prize-card');
    card?.classList.remove('deal-in');
    card?.classList.add('deal-out');
    tone(260,.07,.018);
    await sleep(230);
    revealIndex=Math.min(revealIndex+1,pending.prizes.length-1);
    showSequentialPrize(revealIndex);
  };

  async function openPacksSequential(){
    const count=state.batchCount;
    const unitPrice=packPrice();
    const cost=unitPrice*count;
    if(state.config.maintenance)return toast('Openings are paused');
    if(state.balance<cost)return toast('Not enough USDC');

    await refreshQuotes();
    const lockedPrices=Object.fromEntries(Object.entries(STOCKS).map(([t,s])=>[t,s.price]));
    const commit=await buildCommit(count);
    state.balance-=cost;
    state.metrics.packVolume+=cost;
    state.metrics.grossFees+=cost*state.config.margin;
    state.liquidity.fees+=cost*state.config.margin;
    state.pending={commit,lockedPrices,cost,unitPrice,count,status:'committed'};
    save();
    renderAll();

    const rv=document.querySelector('#reveal');
    const results=document.querySelector('#revealResults');
    revealIndex=0;
    results.classList.remove('sequential');
    results.innerHTML='';
    rv.className='reveal open';
    document.querySelector('#scanText').textContent='COMMITMENT LOCKED';
    actions.classList.add('hidden');
    nextButton.classList.add('hidden');

    await sleep(360);
    rv.classList.add('scanning');
    for(const [i,text] of ['SHUFFLING PACK','WAITING FOR FUTURE BLOCK','LOCKING QUOTE','DERIVING RANDOMNESS'].entries()){
      await sleep(290);
      document.querySelector('#scanText').textContent=text;
      tone(210+i*95);
    }

    const elapsed=(Date.now()-commit.createdAt)/1000;
    if(elapsed>state.config.timeoutSec&&state.config.autoRefund){refundPending('Settlement timeout');return;}

    const prizes=[];
    for(let i=0;i<count;i++)prizes.push(derivePrize(commit,i,lockedPrices));
    const drift=simulateDrift();
    if(Math.abs(drift-1)>state.config.maxSlippage){refundPending('Quote drift exceeded');return;}
    for(const prize of prizes){
      if(state.inventory[prize.ticker].availableValue<prize.value*.9){refundPending('Inventory changed before settlement');return;}
    }
    for(const prize of prizes){
      state.inventory[prize.ticker].availableValue=Math.max(0,state.inventory[prize.ticker].availableValue-prize.value);
    }

    state.pending.prizes=prizes;
    state.pending.status='revealed';
    state.pending.drift=drift;
    save();

    rv.classList.remove('scanning');
    rv.classList.add('done');
    document.querySelector('#scanText').textContent=count===1?'REVEALING CARD':'CARD 1 OF '+count;
    await sleep(180);
    showSequentialPrize(0);
  }

  document.querySelector('#openPack').onclick=openPacksSequential;
  renderPacks();
})();