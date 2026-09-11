(()=>{
  const rarityRank={Common:0,Uncommon:1,Rare:2,Epic:3,Legendary:4};
  const baseDerive=window.derivePrize;
  if(typeof baseDerive!=='function')return;

  const inFlight=new Map();

  function floorForCount(count){
    if(count>=10)return {name:'Rare',rank:rarityRank.Rare};
    if(count>=5)return {name:'Uncommon',rank:rarityRank.Uncommon};
    return null;
  }

  function deterministicIndex(hex,count,offset=0){
    const slice=(hex||'').slice(offset,offset+8)||'0';
    return parseInt(slice,16)%Math.max(1,count);
  }

  function deterministicTicker(commit,targetValue,offset=8){
    const eligible=Object.entries(state.inventory||{})
      .filter(([ticker,inv])=>STOCKS[ticker]&&Number(inv?.availableValue||0)>=targetValue)
      .map(([ticker])=>ticker)
      .sort();
    if(!eligible.length)return null;
    return eligible[deterministicIndex(commit?.revealHash,eligible.length,offset)];
  }

  function applyFloor(batch,commit,lockedPrices,count){
    const floor=floorForCount(count);
    if(!floor||batch.some(p=>(rarityRank[p?.rarity]??0)>=floor.rank))return null;

    const tier=RARITIES.find(r=>r.name===floor.name);
    if(!tier)return null;

    const slot=deterministicIndex(commit?.revealHash,count,0);
    const prize=batch[slot];
    if(!prize)return null;

    const previousValue=Number(prize.value)||0;
    const targetValue=Number(tier.min)||previousValue;
    const ticker=deterministicTicker(commit,targetValue,8)||prize.ticker;
    const price=Number(lockedPrices?.[ticker]||STOCKS[ticker]?.price||prize.price)||1;

    prize.ticker=ticker;
    prize.rarity=tier.name;
    prize.value=Math.max(previousValue,targetValue);
    prize.price=price;
    prize.shares=prize.value/price;
    prize.guaranteed=true;
    prize.guaranteeFloor=tier.name;

    const uplift=Math.max(0,prize.value-previousValue);
    if(uplift>0){
      state.metrics.grossFees=Math.max(0,Number(state.metrics.grossFees||0)-uplift);
      state.liquidity.fees=Math.max(0,Number(state.liquidity.fees||0)-uplift);
    }

    return {slot,floor:tier.name,uplift};
  }

  window.derivePrize=function(commit,index,lockedPrices){
    const prize=baseDerive(commit,index,lockedPrices);
    const count=Math.max(1,Number(commit?.count||state.batchCount)||1);
    const key=commit?.revealHash||commit?.commitment||String(commit?.createdAt||Date.now());
    let batch=inFlight.get(key);
    if(!batch){batch=new Array(count);inFlight.set(key,batch);}
    batch[index]=prize;

    if(index===count-1){
      const guarantee=applyFloor(batch,commit,lockedPrices,count);
      if(guarantee&&state.pending){
        state.pending.guarantee={...guarantee,count,rule:count>=10?'10-pack Rare+ floor':'5-pack Uncommon+ floor'};
      }
      inFlight.delete(key);
    }
    return prize;
  };

  const slider=document.querySelector('#packCountSlider');
  const scale=document.querySelector('.batch-slider-scale');
  if(slider&&scale){
    const note=document.createElement('div');
    note.id='batchGuarantee';
    note.className='batch-guarantee';
    scale.insertAdjacentElement('afterend',note);

    const renderGuarantee=()=>{
      const count=Math.max(1,Math.min(10,Number(slider.value)||1));
      if(count>=10){
        note.className='batch-guarantee rare';
        note.innerHTML='<b>10-pack guarantee</b><span>At least one Rare or better</span>';
      }else if(count>=5){
        note.className='batch-guarantee uncommon';
        note.innerHTML='<b>5+ pack guarantee</b><span>At least one Uncommon or better</span>';
      }else{
        note.className='batch-guarantee';
        note.innerHTML='<b>Batch floors</b><span>5+ = Uncommon+ · 10 = Rare+</span>';
      }
    };
    slider.addEventListener('input',renderGuarantee);
    renderGuarantee();
  }

  const baseRenderPrizeCard=window.renderPrizeCard;
  if(typeof baseRenderPrizeCard==='function'){
    window.renderPrizeCard=function(prize){
      const html=baseRenderPrizeCard(prize);
      if(!prize?.guaranteed)return html;
      return html.replace('<div class="pc-top">','<div class="guarantee-chip">BATCH GUARANTEE</div><div class="pc-top">');
    };
  }
})();
