(()=>{
  const root=document.querySelector('#portfolioPerformance');
  if(!root)return;

  const chartEl=document.querySelector('#portfolioPerformanceChart');
  const rangeRoot=document.querySelector('#portfolioRanges');
  const valueEl=document.querySelector('#portfolioPerfValue');
  const changeEl=document.querySelector('#portfolioPerfChange');
  let perfChart=null;
  let perfSeries=null;
  let activeRange='1D';
  let requestToken=0;

  const rangeMap={
    '1D':'1D',
    '7D':'1W',
    '30D':'1M',
    '3M':'3M',
    '1Y':'1Y',
    'ALL':'ALL'
  };

  function holdings(){
    return Object.entries(state.holdings||{}).filter(([ticker,h])=>STOCKS[ticker]&&Number(h?.shares)>1e-8);
  }

  async function historyFor(ticker,range){
    try{
      const res=await fetch(`/api/chart?symbol=${encodeURIComponent(ticker)}&range=${encodeURIComponent(rangeMap[range]||'1D')}`,apiOpts());
      if(!res.ok)throw new Error('history');
      const json=await res.json();
      const bars=(json.bars||[]).map(b=>({time:Number(b.time),close:Number(b.close)})).filter(b=>Number.isFinite(b.time)&&Number.isFinite(b.close));
      if(bars.length>2)return bars;
    }catch{}
    return [];
  }

  function fallbackSeries(range,current){
    const cfg={
      '1D':[48,1800],
      '7D':[56,10800],
      '30D':[60,43200],
      '3M':[70,86400],
      '1Y':[90,345600],
      'ALL':[110,604800]
    }[range]||[48,1800];
    const now=Math.floor(Date.now()/1000);
    let value=current*(.985+Math.random()*.012);
    const rows=[];
    for(let i=cfg[0]-1;i>=0;i--){
      value*=1+(Math.random()-.49)*.0035;
      rows.push({time:now-i*cfg[1],value});
    }
    rows[rows.length-1].value=current;
    return rows;
  }

  function aggregateSeries(seriesByTicker,current){
    const entries=holdings();
    const times=[...new Set(Object.values(seriesByTicker).flatMap(rows=>rows.map(r=>r.time)))].sort((a,b)=>a-b);
    if(!times.length)return [];
    const cursors={};
    const lasts={};
    for(const [ticker] of entries){cursors[ticker]=0;lasts[ticker]=null;}
    const out=[];
    for(const time of times){
      let total=Number(state.balance)||0;
      for(const [ticker,h] of entries){
        const rows=seriesByTicker[ticker]||[];
        let i=cursors[ticker]||0;
        while(i<rows.length&&rows[i].time<=time){lasts[ticker]=rows[i].close;i++;}
        cursors[ticker]=i;
        const close=lasts[ticker]??rows[0]?.close??STOCKS[ticker].price;
        total+=Number(h.shares||0)*Number(close||0);
      }
      out.push({time,value:total});
    }
    if(out.length)out[out.length-1].value=current;
    return out;
  }

  function draw(data){
    const current=(Number(state.balance)||0)+portfolioValue();
    const first=data[0]?.value??current;
    const last=data.at(-1)?.value??current;
    const change=last-first;
    const pct=first?change/first*100:0;
    valueEl.textContent=money(last);
    changeEl.textContent=`${change>=0?'+':''}${money(change)} (${pct>=0?'+':''}${pct.toFixed(2)}%)`;
    changeEl.className=change>=0?'up':'down';

    chartEl.innerHTML='';
    if(!window.LightweightCharts){chartEl.innerHTML='<div style="height:100%;display:grid;place-items:center;color:#68727d;font-size:9px">Chart unavailable</div>';return;}
    try{perfChart?.remove()}catch{}
    perfChart=LightweightCharts.createChart(chartEl,{
      width:chartEl.clientWidth,
      height:chartEl.clientHeight,
      layout:{background:{color:'#0d1014'},textColor:'#707a84'},
      grid:{vertLines:{color:'#171c21'},horzLines:{color:'#171c21'}},
      rightPriceScale:{borderColor:'#252c33'},
      timeScale:{borderColor:'#252c33',timeVisible:activeRange==='1D'||activeRange==='7D'},
      crosshair:{vertLine:{color:'#39414a'},horzLine:{color:'#39414a'}}
    });
    const up=change>=0;
    perfSeries=perfChart.addAreaSeries({
      lineColor:up?'#9cff67':'#ff6972',
      topColor:up?'rgba(156,255,103,.20)':'rgba(255,105,114,.18)',
      bottomColor:'transparent',
      lineWidth:2,
      priceFormat:{type:'price',precision:2,minMove:.01}
    });
    perfSeries.setData(data);
    perfChart.timeScale().fitContent();
  }

  async function renderPerformance(range=activeRange){
    activeRange=range;
    const token=++requestToken;
    rangeRoot.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.range===range));
    chartEl.innerHTML='<div style="height:100%;display:grid;place-items:center;color:#68727d;font-size:9px">Building portfolio history…</div>';
    const current=(Number(state.balance)||0)+portfolioValue();
    const entries=holdings();
    if(!entries.length){draw(fallbackSeries(range,current));return;}
    const histories={};
    await Promise.all(entries.map(async([ticker])=>{histories[ticker]=await historyFor(ticker,range);}));
    if(token!==requestToken)return;
    const enough=Object.values(histories).some(rows=>rows.length>2);
    draw(enough?aggregateSeries(histories,current):fallbackSeries(range,current));
  }

  rangeRoot.addEventListener('click',e=>{
    const b=e.target.closest('button[data-range]');
    if(!b)return;
    renderPerformance(b.dataset.range);
  });

  function setPortfolioDetailMode(active){
    const view=document.querySelector('#portfolioView');
    const detail=document.querySelector('#portfolioDetail');
    if(!view||!detail)return;

    [
      '#portfolioView > .summary-grid',
      '#portfolioPerformance',
      '#portfolioList',
      '#portfolioView > .api-inline'
    ].forEach(selector=>{
      const el=document.querySelector(selector);
      if(el)el.classList.toggle('hidden',active);
    });

    detail.classList.toggle('hidden',!active);
    detail.classList.toggle('on',active);
    view.classList.toggle('stock-detail-mode',active);
  }

  openPosition=function(ticker){
    state.selected=ticker;
    const sellAmount=document.querySelector('#sellAmount');
    if(sellAmount)sellAmount.value='0';
    setPortfolioDetailMode(true);
    renderPosition();
    buildChart('1D');
    save();
    window.scrollTo({top:0,behavior:'smooth'});
  };

  showPortfolioList=function(){
    state.selected=null;
    setPortfolioDetailMode(false);
    save();
    clearTimeout(renderPortfolio._perfTimer);
    renderPortfolio._perfTimer=setTimeout(()=>renderPerformance(activeRange),40);
  };

  const back=document.querySelector('#backPortfolio');
  if(back)back.onclick=showPortfolioList;

  const baseRenderPortfolio=renderPortfolio;
  renderPortfolio=function(){
    baseRenderPortfolio();
    document.querySelectorAll('.position-row').forEach(row=>{
      row.onclick=()=>openPosition(row.dataset.ticker);
    });
    clearTimeout(renderPortfolio._perfTimer);
    renderPortfolio._perfTimer=setTimeout(()=>{
      const view=document.querySelector('#portfolioView');
      if(view?.classList.contains('active')&&!view.classList.contains('stock-detail-mode'))renderPerformance(activeRange);
    },40);
  };

  window.addEventListener('resize',()=>{
    if(perfChart&&chartEl.clientWidth)perfChart.applyOptions({width:chartEl.clientWidth,height:chartEl.clientHeight});
  });

  document.querySelectorAll('.position-row').forEach(row=>{
    row.onclick=()=>openPosition(row.dataset.ticker);
  });

  if(state.selected&&state.holdings?.[state.selected]?.shares>1e-8){
    setPortfolioDetailMode(true);
    renderPosition();
    buildChart('1D');
  }else{
    setPortfolioDetailMode(false);
    renderPerformance(activeRange);
  }
})();