const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const money = n => '$' + Number(n || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const fmt = n => Number(n || 0).toLocaleString(undefined,{maximumFractionDigits:6});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uid=(p='id')=>`${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;

const STOCKS={
  AAPL:{name:'Apple Inc.',price:228.42,day:.0074},NVDA:{name:'NVIDIA',price:177.18,day:.0128},TSLA:{name:'Tesla',price:347.65,day:-.0092},AMZN:{name:'Amazon',price:238.57,day:.0049},MSFT:{name:'Microsoft',price:509.21,day:.0035},META:{name:'Meta',price:755.64,day:-.0031},GOOGL:{name:'Alphabet',price:245.38,day:.0061}
};
const RARITIES=[
  {name:'Common',weight:65,min:25,max:40,color:'#a5abb2'},
  {name:'Uncommon',weight:24,min:40,max:60,color:'#9cff67'},
  {name:'Rare',weight:8,min:65,max:110,color:'#78a9ff'},
  {name:'Epic',weight:2.5,min:125,max:250,color:'#ca8cff'},
  {name:'Legendary',weight:.5,min:500,max:500,color:'#ffd15c'}
];
const DEFAULT_INVENTORY={
  AAPL:{availableValue:2400,initialValue:2400,backing:1300},NVDA:{availableValue:2200,initialValue:2200,backing:1200},TSLA:{availableValue:1600,initialValue:1600,backing:900},AMZN:{availableValue:1800,initialValue:1800,backing:950},MSFT:{availableValue:1800,initialValue:1800,backing:1000},META:{availableValue:1500,initialValue:1500,backing:800},GOOGL:{availableValue:1700,initialValue:1700,backing:900}
};
const DEFAULT_STATE={
  balance:1000,
  holdings:{AAPL:{shares:.64,cost:142.5},NVDA:{shares:.22,cost:39.1}},
  listings:[],
  activity:[],
  inventory:DEFAULT_INVENTORY,
  liquidity:{usdc:5000,fees:0,lpContributions:10000},
  metrics:{packVolume:0,grossFees:0,sellbacks:0},
  config:{margin:.07,sellFee:.01,maxSlippage:.02,timeoutSec:45,autoRefund:true,inventoryOdds:true,maintenance:false},
  selected:null,batchCount:1,pending:null
};
let state=loadState();
let chart=null,series=null;

function clone(v){return JSON.parse(JSON.stringify(v))}
function loadState(){try{const raw=localStorage.getItem('stockswap_protocol_v2');if(!raw)return clone(DEFAULT_STATE);const s=JSON.parse(raw);return {...clone(DEFAULT_STATE),...s,config:{...DEFAULT_STATE.config,...s.config},liquidity:{...DEFAULT_STATE.liquidity,...s.liquidity},metrics:{...DEFAULT_STATE.metrics,...s.metrics},inventory:{...clone(DEFAULT_INVENTORY),...s.inventory}}}catch{return clone(DEFAULT_STATE)}}
function save(){localStorage.setItem('stockswap_protocol_v2',JSON.stringify(state))}
function toast(t){$('#toast').textContent=t;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),1700)}
function apiKey(){return sessionStorage.getItem('stockswap_rapidapi_key')||''}
function apiOpts(){const key=apiKey();return{cache:'no-store',headers:key?{'x-stockswap-api-key':key}:{}}}
async function sha256(text){const bytes=new TextEncoder().encode(text);const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function hexFloat(hex,start=0){return parseInt(hex.slice(start,start+12),16)/0xffffffffffff}

function inventoryValue(){return Object.values(state.inventory).reduce((a,x)=>a+x.availableValue,0)}
function portfolioValue(){return Object.entries(state.holdings).reduce((a,[t,h])=>a+(h.shares||0)*(STOCKS[t]?.price||0),0)}
function outstandingStock(){return portfolioValue()+state.listings.reduce((a,x)=>a+x.value,0)}
function avgPrizeEV(){return effectiveOdds().reduce((a,x)=>a+x.odds*((x.min+x.max)/2),0)}
function packPrice(){return avgPrizeEV()/(1-state.config.margin)}
function effectiveOdds(){
  const base=RARITIES.map(r=>({...r,raw:r.weight}));
  if(!state.config.inventoryOdds)return normalizeOdds(base);
  const total=inventoryValue();
  const scarcity=clamp(total/13000,.3,1.15);
  return normalizeOdds(base.map((r,i)=>({...r,raw:r.weight*Math.pow(scarcity,i*.42)})));
}
function normalizeOdds(rows){const total=rows.reduce((a,x)=>a+x.raw,0);return rows.map(x=>({...x,odds:x.raw/total}))}
function chooseWeighted(rows,r){let c=0;for(const x of rows){c+=x.weight;if(r<=c)return x}return rows.at(-1)}
function rarityFromRandom(r){let c=0;for(const x of effectiveOdds()){c+=x.odds;if(r<=c)return x}return effectiveOdds().at(-1)}
function eligibleTickers(value){const rows=Object.entries(state.inventory).filter(([,inv])=>inv.availableValue>=value*.92).map(([ticker,inv])=>({ticker,weight:Math.max(1,inv.availableValue)}));return rows.length?rows:Object.entries(state.inventory).map(([ticker,inv])=>({ticker,weight:Math.max(1,inv.availableValue)}))}
function pickTicker(value,r){const rows=eligibleTickers(value),total=rows.reduce((a,x)=>a+x.weight,0);let c=0,target=r*total;for(const x of rows){c+=x.weight;if(target<=c)return x.ticker}return rows.at(-1).ticker}

async function buildCommit(count){
  const serverSeed=crypto.getRandomValues(new Uint32Array(4)).join('-');
  const nonce=uid('nonce');
  const commitment=await sha256(`${serverSeed}:${nonce}`);
  const futureBlock=`rh-${Math.floor(Date.now()/1000)+2}-${Math.floor(Math.random()*9999)}`;
  const revealHash=await sha256(`${serverSeed}:${futureBlock}:${nonce}`);
  return{serverSeed,nonce,commitment,futureBlock,revealHash,count,createdAt:Date.now()};
}
function derivePrize(commit,index,lockedPrices){
  const h=commit.revealHash;
  const shift=(index*13)%48;
  const r1=hexFloat(h,shift),r2=hexFloat(h,(shift+12)%48),r3=hexFloat(h,(shift+24)%48);
  const rarity=rarityFromRandom(r1);
  const value=rarity.min+(rarity.max-rarity.min)*r2;
  const ticker=pickTicker(value,r3);
  const price=lockedPrices[ticker]||STOCKS[ticker].price;
  const actualValue=Math.min(value,state.inventory[ticker].availableValue||value);
  return{ticker,rarity:rarity.name,value:actualValue,price,shares:actualValue/price,index};
}
function simulateDrift(){return 1+(Math.random()-.5)*.012}

function renderNav(view){$$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$$('.view').forEach(v=>v.classList.toggle('active',v.id===view+'View'))}
$$('.nav button').forEach(b=>b.onclick=()=>{renderNav(b.dataset.view);renderAll();if(b.dataset.view==='portfolio')showPortfolioList()});

function renderPacks(){
  const price=packPrice(),odds=effectiveOdds();
  $('#packPriceHero').textContent=money(price);$('#marginHero').textContent=(state.config.margin*100).toFixed(0)+'%';$('#liquidityHero').textContent=money(state.liquidity.usdc);
  $('#oddsList').innerHTML=odds.map(r=>`<div class="odd-row" style="--c:${r.color}"><i></i><div><b>${r.name}</b><small>${money(r.min)}–${money(r.max)}</small></div><span>${(r.odds*100).toFixed(r.odds<.01?2:1)}%</span></div>`).join('');
  const count=state.batchCount,cost=price*count;$('#openCountText').textContent=`${count} pack${count>1?'s':''}`;$('#openCost').textContent=money(cost);$('#openPriceButton').textContent=money(cost)+' USDC';
  $('#openPack').disabled=state.config.maintenance||state.balance<cost;
}
$('#batch').onclick=e=>{const b=e.target.closest('button');if(!b)return;state.batchCount=+b.dataset.count;$$('#batch button').forEach(x=>x.classList.toggle('active',x===b));save();renderPacks()};

function renderPortfolio(){
  const pv=portfolioValue();$('#totalValue').textContent=money(state.balance+pv);$('#stockValue').textContent=money(pv);$('#cashValue').textContent=money(state.balance);$('#listingCount').textContent=state.listings.length;$('#wallet').textContent=money(state.balance)+' USDC';
  const rows=Object.entries(state.holdings).filter(([,h])=>h.shares>1e-8);
  $('#portfolioList').innerHTML=`<div class="positions-head"><span>Asset</span><span>Shares</span><span>Value</span><span>Today</span><span></span></div>${rows.length?rows.map(([t,h])=>`<div class="position-row" data-ticker="${t}"><div class="asset"><div class="asset-logo">${t.slice(0,4)}</div><div><b>${t}</b><small>${STOCKS[t].name}</small></div></div><div><b>${fmt(h.shares)}</b><small>fractional</small></div><div><b>${money(h.shares*STOCKS[t].price)}</b><small>@ ${money(STOCKS[t].price)}</small></div><div class="${STOCKS[t].day>=0?'green':'red'}"><b>${STOCKS[t].day>=0?'+':''}${(STOCKS[t].day*100).toFixed(2)}%</b></div><button class="view-pos">View</button></div>`).join(''):'<div style="padding:50px;text-align:center;color:#727c86;font-size:10px">No positions yet.</div>'}`;
  $$('.position-row').forEach(r=>r.onclick=()=>openPosition(r.dataset.ticker));
}
function showPortfolioList(){state.selected=null;$('#portfolioList').classList.remove('hidden');$('#portfolioDetail').classList.add('hidden');save()}
$('#backPortfolio').onclick=showPortfolioList;
function openPosition(t){state.selected=t;$('#portfolioList').classList.add('hidden');$('#portfolioDetail').classList.remove('hidden');$('#sellAmount').value='0';renderPosition();buildChart('1D');save()}
function renderPosition(){const t=state.selected;if(!t)return;const h=state.holdings[t]||{shares:0,cost:0},s=STOCKS[t],v=h.shares*s.price,p=v-h.cost;$('#detailName').textContent=s.name;$('#detailTicker').textContent=$('#sellTicker').textContent=t;$('#detailPrice').textContent=money(s.price);$('#detailDay').textContent=(s.day>=0?'+':'')+(s.day*100).toFixed(2)+'%';$('#detailDay').className=s.day>=0?'green':'red';$('#availableShares').textContent=fmt(h.shares)+' available';$('#positionStats').innerHTML=`<div><small>Your shares</small><b>${fmt(h.shares)}</b></div><div><small>Position value</small><b>${money(v)}</b></div><div><small>Avg. cost</small><b>${h.shares?money(h.cost/h.shares):'$0.00'}</b></div><div><small>Unrealized</small><b class="${p>=0?'green':'red'}">${p>=0?'+':''}${money(p)}</b></div>`;renderSellQuote()}
function renderSellQuote(){const t=state.selected;if(!t)return;const h=state.holdings[t]||{shares:0};const n=clamp(parseFloat($('#sellAmount').value)||0,0,h.shares),market=n*STOCKS[t].price,fee=market*state.config.sellFee,receive=market-fee;$('#sellMarket').textContent=money(market);$('#sellFee').textContent=money(fee);$('#sellReceive').textContent=money(receive);$('#reserveAfter').textContent=money(state.liquidity.usdc-receive);$('#sellButton').disabled=!n||receive>state.liquidity.usdc}
$('#sellAmount').oninput=renderSellQuote;$('#quickSell').onclick=e=>{const b=e.target.closest('button');if(!b||!state.selected)return;$('#sellAmount').value=(state.holdings[state.selected].shares*+b.dataset.pct).toFixed(6);renderSellQuote()};
$('#sellButton').onclick=()=>{const t=state.selected,h=state.holdings[t],n=clamp(parseFloat($('#sellAmount').value)||0,0,h.shares);if(!n)return;const market=n*STOCKS[t].price,fee=market*state.config.sellFee,receive=market-fee;if(receive>state.liquidity.usdc)return toast('Liquidity reserve too low');const before=h.shares;h.shares-=n;h.cost=Math.max(0,h.cost*(1-n/before));state.balance+=receive;state.liquidity.usdc-=receive;state.liquidity.fees+=fee;state.metrics.grossFees+=fee;state.metrics.sellbacks+=market;pushActivity({type:'Portfolio sell',ticker:t,value:market,status:'settled',detail:`${fmt(n)} shares sold`,proof:null});$('#sellAmount').value='0';save();renderAll();h.shares>1e-8?renderPosition():showPortfolioList();toast(`Sold ${fmt(n)} ${t}`)};
$('#withdrawButton').onclick=()=>{if(!state.selected)return;pushActivity({type:'Withdrawal request',ticker:state.selected,value:0,status:'pending',detail:'Awaiting Robinhood Chain adapter',proof:null});save();renderActivity();toast('Withdrawal queued in simulation')};
$('#listButton').onclick=()=>{const t=state.selected,h=state.holdings[t];if(!h?.shares)return;const shares=h.shares*.25,value=shares*STOCKS[t].price;state.listings.push({id:uid('listing'),ticker:t,shares,value,createdAt:Date.now()});pushActivity({type:'Listing created',ticker:t,value,status:'settled',detail:`${fmt(shares)} shares listed`,proof:null});save();renderAll();toast('25% position listed')};

async function buildChart(range){const t=state.selected;if(!t)return;const el=$('#chart');el.innerHTML='<div style="height:100%;display:grid;place-items:center;color:#68727d;font-size:9px">Loading market data…</div>';let data=[];try{const r=await fetch(`/api/chart?symbol=${encodeURIComponent(t)}&range=${range}`,apiOpts());if(r.ok){const j=await r.json();data=(j.bars||[]).map(b=>({time:b.time,value:b.close})).filter(x=>Number.isFinite(x.value))}}catch{}if(data.length<3){const now=Math.floor(Date.now()/1000),steps=range==='1D'?80:90,gap=range==='1D'?300:range==='1W'?7200:86400;let p=STOCKS[t].price;data=[];for(let i=steps;i>0;i--){p*=1+(Math.random()-.5)*.007;data.push({time:now-i*gap,value:p})}data.push({time:now,value:STOCKS[t].price})}el.innerHTML='';if(!window.LightweightCharts)return;try{chart?.remove()}catch{}chart=LightweightCharts.createChart(el,{width:el.clientWidth,height:el.clientHeight,layout:{background:{color:'#0d1014'},textColor:'#707a84'},grid:{vertLines:{color:'#171c21'},horzLines:{color:'#171c21'}},rightPriceScale:{borderColor:'#252c33'},timeScale:{borderColor:'#252c33',timeVisible:range==='1D'||range==='1W'}});series=chart.addAreaSeries({lineColor:STOCKS[t].day>=0?'#9cff67':'#ff6972',topColor:STOCKS[t].day>=0?'rgba(156,255,103,.2)':'rgba(255,105,114,.2)',bottomColor:'transparent',lineWidth:2});series.setData(data);chart.timeScale().fitContent()}
$('#ranges').onclick=e=>{const b=e.target.closest('button');if(!b)return;$$('#ranges button').forEach(x=>x.classList.toggle('active',x===b));buildChart(b.dataset.range)};

function pushActivity(a){state.activity.unshift({id:uid('evt'),createdAt:Date.now(),verified:false,...a});state.activity=state.activity.slice(0,100)}
function renderActivity(){const rows=state.activity;$('#activityCount').textContent=rows.length;$('#verifiedCount').textContent=rows.filter(x=>x.verified).length;$('#refundCount').textContent=rows.filter(x=>x.status==='refunded').length;$('#activityList').innerHTML=rows.length?rows.map(a=>`<div class="activity-row"><div><b>${a.type}</b><small>${new Date(a.createdAt).toLocaleString()}</small></div><div><b>${a.ticker||'—'} ${a.value?money(a.value):''}</b><small>${a.detail||''}</small></div><span class="status ${a.status}">${a.status}</span><div><b>${a.proof?a.proof.commitment.slice(0,10)+'…':'—'}</b><small>${a.proof?'commitment':'no proof'}</small></div><button class="verify-btn" data-proof="${a.id}" ${a.proof?'':'disabled'}>${a.verified?'Verified':'Verify'}</button></div>`).join(''):'<div style="padding:50px;text-align:center;color:#727c86;font-size:10px">No activity yet.</div>';$$('[data-proof]').forEach(b=>b.onclick=()=>openProof(b.dataset.proof))}
async function verifyProof(a){if(!a?.proof)return false;const p=a.proof,commit=await sha256(`${p.serverSeed}:${p.nonce}`),reveal=await sha256(`${p.serverSeed}:${p.futureBlock}:${p.nonce}`);return commit===p.commitment&&reveal===p.revealHash}
async function openProof(id){const a=state.activity.find(x=>x.id===id);if(!a?.proof)return;const ok=await verifyProof(a);a.verified=ok;save();renderActivity();$('#proofTitle').textContent=`${a.type} · ${a.ticker||'Pack'}`;$('#proofContent').innerHTML=`<div class="proof-grid"><div class="proof-item"><small>Commitment</small><code>${a.proof.commitment}</code></div><div class="proof-item"><small>Future block seed</small><code>${a.proof.futureBlock}</code></div><div class="proof-item"><small>Server seed</small><code>${a.proof.serverSeed}</code></div><div class="proof-item"><small>Nonce</small><code>${a.proof.nonce}</code></div><div class="proof-item"><small>Reveal hash</small><code>${a.proof.revealHash}</code></div><div class="proof-item"><small>Locked quote</small><b>${money(a.proof.lockedPrice||0)}</b></div></div><div class="proof-result">${ok?'✓ Commitment and reveal recompute correctly.':'Verification failed.'}</div><div class="micro">Prototype note: the “future block” value is simulated. Production should source it from Robinhood Chain / an auditable randomness mechanism.</div>`;$('#proofModal').classList.add('open')}
$('#verifyAll').onclick=async()=>{for(const a of state.activity.filter(x=>x.proof))a.verified=await verifyProof(a);save();renderActivity();toast('All available proofs checked')};

function renderLiquidity(){$('#lpReserve').textContent=money(state.liquidity.usdc);$('#lpInventoryValue').textContent=money(inventoryValue());$('#lpFees').textContent=money(state.liquidity.fees);$('#inventoryTable').innerHTML=Object.entries(state.inventory).map(([t,x])=>{const pct=x.initialValue?clamp(x.availableValue/x.initialValue*100,0,100):100;return`<div class="inventory-row"><div><b>${t}</b><small>${STOCKS[t].name}</small></div><div><b>${money(x.availableValue)}</b><small>available</small><div class="inventory-bar"><i style="width:${pct}%"></i></div></div><div><b>${money(x.backing)}</b><small>USDC backing</small></div><div><b>${pct.toFixed(0)}%</b><small>remaining</small></div></div>`}).join('');$('#lpTicker').innerHTML=Object.keys(STOCKS).map(t=>`<option>${t}</option>`).join('')}
$('#addLiquidity').onclick=()=>{const t=$('#lpTicker').value,stock=Math.max(0,+$('#lpStockAmount').value||0),cash=Math.max(0,+$('#lpCashAmount').value||0);if(!stock&&!cash)return toast('Enter liquidity amounts');state.inventory[t].availableValue+=stock;state.inventory[t].initialValue+=stock;state.inventory[t].backing+=cash;state.liquidity.usdc+=cash;state.liquidity.lpContributions+=stock+cash;pushActivity({type:'LP deposit',ticker:t,value:stock+cash,status:'settled',detail:`${money(stock)} inventory + ${money(cash)} backing`,proof:null});save();renderAll();toast('Simulated liquidity added')};

function renderAdmin(){$('#adminVolume').textContent=money(state.metrics.packVolume);$('#adminFees').textContent=money(state.metrics.grossFees);$('#adminSellbacks').textContent=money(state.metrics.sellbacks);$('#adminOutstanding').textContent=money(outstandingStock());$('#marginRange').value=state.config.margin*100;$('#sellFeeRange').value=state.config.sellFee*100;$('#slippageRange').value=state.config.maxSlippage*100;$('#timeoutRange').value=state.config.timeoutSec;$('#autoRefund').checked=state.config.autoRefund;$('#inventoryOdds').checked=state.config.inventoryOdds;$('#maintenance').checked=state.config.maintenance;updateAdminLabels()}
function updateAdminLabels(){$('#marginLabel').textContent=(state.config.margin*100).toFixed(0)+'%';$('#sellFeeLabel').textContent=(state.config.sellFee*100).toFixed(2).replace(/\.00$/,'')+'%';$('#slippageLabel').textContent=(state.config.maxSlippage*100).toFixed(1)+'%';$('#timeoutLabel').textContent=state.config.timeoutSec+' sec'}
$('#marginRange').oninput=e=>{state.config.margin=+e.target.value/100;updateAdminLabels();save();renderPacks()};$('#sellFeeRange').oninput=e=>{state.config.sellFee=+e.target.value/100;updateAdminLabels();save()};$('#slippageRange').oninput=e=>{state.config.maxSlippage=+e.target.value/100;updateAdminLabels();save()};$('#timeoutRange').oninput=e=>{state.config.timeoutSec=+e.target.value;updateAdminLabels();save()};$('#autoRefund').onchange=e=>{state.config.autoRefund=e.target.checked;save()};$('#inventoryOdds').onchange=e=>{state.config.inventoryOdds=e.target.checked;save();renderPacks()};$('#maintenance').onchange=e=>{state.config.maintenance=e.target.checked;save();renderPacks()};

function renderPrizeCard(p){const r=RARITIES.find(x=>x.name===p.rarity)||RARITIES[0];return`<div class="prize-card" style="--accent:${hexToRgb(r.color)}"><div class="pc-top"><div><small>${STOCKS[p.ticker].name}</small><b>${p.ticker}</b></div><span class="pc-rarity">${p.rarity}</span></div><div class="pc-mark">${p.ticker.slice(0,2)}</div><div class="pc-bottom"><small>You receive</small><strong>${fmt(p.shares)} shares</strong><span>${money(p.price)} / share</span><div class="pc-value"><small>Position value</small><b>${money(p.value)}</b></div></div></div>`}
function hexToRgb(hex){const n=parseInt(hex.slice(1),16);return`${(n>>16)&255},${(n>>8)&255},${n&255}`}
function particles(n,color){const root=$('#particles');root.innerHTML='';$('#reveal').style.setProperty('--accent',hexToRgb(color));for(let i=0;i<n;i++){const el=document.createElement('i'),a=Math.random()*Math.PI*2,d=70+Math.random()*260;el.className='particle';el.style.setProperty('--x',Math.cos(a)*d+'px');el.style.setProperty('--y',Math.sin(a)*d+'px');root.appendChild(el)}}
let audioCtx;function tone(f,d=.08,v=.025,delay=0){try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+delay;o.frequency.value=f;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+d+.02)}catch{}}
async function openPacks(){
  const count=state.batchCount,unitPrice=packPrice(),cost=unitPrice*count;if(state.config.maintenance)return toast('Openings are paused');if(state.balance<cost)return toast('Not enough USDC');
  await refreshQuotes();const lockedPrices=Object.fromEntries(Object.entries(STOCKS).map(([t,s])=>[t,s.price]));const commit=await buildCommit(count);state.balance-=cost;state.metrics.packVolume+=cost;state.metrics.grossFees+=cost*state.config.margin;state.liquidity.fees+=cost*state.config.margin;state.pending={commit,lockedPrices,cost,unitPrice,count,status:'committed'};save();renderAll();
  const rv=$('#reveal');rv.className='reveal open';$('#scanText').textContent='COMMITMENT LOCKED';$('#revealResults').innerHTML='';$('#revealActions').classList.add('hidden');await sleep(450);rv.classList.add('scanning');
  for(const [i,text] of ['WAITING FOR FUTURE BLOCK','READING INVENTORY','LOCKING QUOTE','DERIVING RANDOMNESS'].entries()){await sleep(330);$('#scanText').textContent=text;tone(210+i*95)}
  const elapsed=(Date.now()-commit.createdAt)/1000;if(elapsed>state.config.timeoutSec&&state.config.autoRefund){refundPending('Settlement timeout');return}
  const prizes=[];for(let i=0;i<count;i++)prizes.push(derivePrize(commit,i,lockedPrices));
  const drift=simulateDrift();if(Math.abs(drift-1)>state.config.maxSlippage){refundPending('Quote drift exceeded');return}
  for(const p of prizes){if(state.inventory[p.ticker].availableValue<p.value*.9){refundPending('Inventory changed before settlement');return}}
  for(const p of prizes)state.inventory[p.ticker].availableValue=Math.max(0,state.inventory[p.ticker].availableValue-p.value);
  state.pending.prizes=prizes;state.pending.status='revealed';state.pending.drift=drift;save();rv.classList.remove('scanning');rv.classList.add('done');const topR=RARITIES.reduce((a,r)=>prizes.some(p=>p.rarity===r.name)&&r.weight<a.weight?r:a,RARITIES[0]);particles(count===1?45:90,topR.color);tone(660,.25,.04);$('#scanText').textContent=count===1?`${prizes[0].rarity.toUpperCase()} · ${prizes[0].ticker}`:`${count} PACKS REVEALED`;$('#revealResults').innerHTML=prizes.map(renderPrizeCard).join('');
  $('#revealActions').classList.remove('hidden');$('#keepReveal').classList.toggle('hidden',count!==1);$('#sellReveal').classList.toggle('hidden',count!==1);$('#keepAllReveal').classList.toggle('hidden',count===1);$('#sellAllReveal').classList.toggle('hidden',count===1);
}
function refundPending(reason){const p=state.pending;if(!p)return;state.balance+=p.cost;pushActivity({type:'Pack refund',value:p.cost,status:'refunded',detail:reason,proof:{...p.commit,lockedPrice:p.unitPrice}});state.pending=null;save();renderAll();$('#reveal').className='reveal';toast('Pack refunded: '+reason)}
function settlePending(mode){const p=state.pending;if(!p?.prizes)return;for(const prize of p.prizes){if(mode==='keep'){const h=state.holdings[prize.ticker]||{shares:0,cost:0};h.shares+=prize.shares;h.cost+=prize.value;state.holdings[prize.ticker]=h}else{const fee=prize.value*state.config.sellFee,receive=prize.value-fee;if(receive>state.liquidity.usdc){toast('Liquidity reserve cannot settle all sells');return}state.balance+=receive;state.liquidity.usdc-=receive;state.liquidity.fees+=fee;state.metrics.grossFees+=fee;state.metrics.sellbacks+=prize.value}}
  p.prizes.forEach(prize=>pushActivity({type:'Pack open',ticker:prize.ticker,value:prize.value,status:'settled',detail:`${prize.rarity} · ${mode==='keep'?'kept':'sold'} · ${fmt(prize.shares)} shares`,proof:{...p.commit,lockedPrice:prize.price}}));state.pending=null;save();renderAll();$('#reveal').className='reveal';toast(mode==='keep'?'Position kept':'Sold to liquidity reserve')}
$('#openPack').onclick=openPacks;$('#keepReveal').onclick=()=>settlePending('keep');$('#sellReveal').onclick=()=>settlePending('sell');$('#keepAllReveal').onclick=()=>settlePending('keep');$('#sellAllReveal').onclick=()=>settlePending('sell');$('#verifyReveal').onclick=()=>{const p=state.pending;if(!p)return;const temp={id:'pending',type:'Pending pack',ticker:p.prizes?.[0]?.ticker||'',proof:{...p.commit,lockedPrice:p.prizes?.[0]?.price||p.unitPrice}};state.activity.unshift(temp);openProof('pending').finally(()=>state.activity.shift())};

async function refreshQuotes(){try{const syms=Object.keys(STOCKS).join(','),r=await fetch(`/api/quotes?symbols=${encodeURIComponent(syms)}`,apiOpts());if(!r.ok)return false;const j=await r.json();for(const q of j.quotes||[]){if(!STOCKS[q.symbol]||!Number.isFinite(q.price))continue;STOCKS[q.symbol].price=q.price;if(Number.isFinite(q.changePercent))STOCKS[q.symbol].day=q.changePercent/100;if(q.name)STOCKS[q.symbol].name=q.name}renderPortfolio();if(state.selected)renderPosition();return true}catch{return false}}

$('#apiOpen').onclick=()=>{$('#apiKeyInput').value=apiKey();updateApiState();$('#apiModal').classList.add('open')};$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).classList.remove('open'));$$('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove('open')});
function updateApiState(msg){const s=$('#apiState'),active=!!apiKey();s.classList.toggle('ok',active);s.querySelector('span').textContent=msg||(active?'Browser API key active':'Using server configuration')}
$('#apiShow').onclick=()=>{const i=$('#apiKeyInput');i.type=i.type==='password'?'text':'password';$('#apiShow').textContent=i.type==='password'?'Show':'Hide'};$('#apiClear').onclick=()=>{sessionStorage.removeItem('stockswap_rapidapi_key');$('#apiKeyInput').value='';updateApiState();toast('Browser API key cleared')};$('#apiSave').onclick=async()=>{const k=$('#apiKeyInput').value.trim();if(!k)return toast('Paste a key first');sessionStorage.setItem('stockswap_rapidapi_key',k);updateApiState('Testing…');const ok=await refreshQuotes();updateApiState(ok?'API key connected':'API test failed');toast(ok?'Market data connected':'API key test failed')};

function renderAll(){renderPacks();renderPortfolio();renderActivity();renderLiquidity();renderAdmin();$('#wallet').textContent=money(state.balance)+' USDC'}

renderAll();updateApiState();refreshQuotes();setInterval(refreshQuotes,15000);