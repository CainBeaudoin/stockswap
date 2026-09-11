const fs = require('fs');
const path = require('path');

const style = `
<style id="api-settings-style">
.api-right{justify-self:end;display:flex;align-items:center;gap:8px}.api-key-btn{border:1px solid #2a3038;background:#11151a;color:#aeb6bf;padding:9px 11px;border-radius:10px;font:900 9px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}.api-key-btn.active{border-color:#416b36;color:#9cff67;background:#111a0f}.api-key-modal{position:fixed;inset:0;background:#030405dc;backdrop-filter:blur(12px);display:none;place-items:center;z-index:250;padding:22px}.api-key-modal.on{display:grid}.api-key-panel{width:min(460px,100%);border:1px solid #2a3038;background:#0d1014;color:#f5f7f8;border-radius:20px;padding:22px;box-shadow:0 30px 100px #000}.api-key-top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px}.api-key-top h3{margin:0;font-size:18px}.api-key-top p{margin:5px 0 0;color:#7b848f;font-size:10px;line-height:1.45}.api-key-close{border:0;background:#171b20;color:#8d96a0;width:30px;height:30px;border-radius:8px;font-size:16px;cursor:pointer}.api-key-field{margin-top:18px}.api-key-field label{display:block;color:#7f8893;font-size:8px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:7px}.api-key-row{display:flex;gap:7px}.api-key-row input{min-width:0;flex:1;border:1px solid #2b3138;background:#090b0d;color:#fff;border-radius:10px;padding:12px;outline:none;font-size:11px}.api-key-row input:focus{border-color:#4a6542}.api-key-row button{border:1px solid #2b3138;background:#15191e;color:#fff;border-radius:10px;padding:0 12px;font-size:9px;font-weight:850;cursor:pointer}.api-key-actions{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:12px}.api-key-save{border:0;background:#9cff67;color:#081006;border-radius:10px;padding:12px;font-size:10px;font-weight:950;cursor:pointer}.api-key-clear{border:1px solid #2b3138;background:#15191e;color:#9aa3ad;border-radius:10px;padding:12px;font-size:10px;font-weight:850;cursor:pointer}.api-key-status{display:flex;align-items:center;gap:7px;margin-top:12px;color:#737c86;font-size:9px}.api-key-status i{width:7px;height:7px;border-radius:50%;background:#606872}.api-key-status.active i{background:#9cff67;box-shadow:0 0 8px #9cff67}.api-key-note{margin-top:12px;padding:10px;border:1px solid #2b3027;background:#11120e;border-radius:9px;color:#92998c;font-size:8px;line-height:1.5}@media(max-width:820px){.api-right .wallet{display:none}.api-key-btn{padding:8px 9px}}
</style>`;

const modal = `
<div id="apiKeyModal" class="api-key-modal" aria-hidden="true"><div class="api-key-panel"><div class="api-key-top"><div><h3>Stock Data API</h3><p>Paste your RapidAPI key here to use it for this browser session.</p></div><button id="apiKeyClose" class="api-key-close" type="button">×</button></div><div class="api-key-field"><label for="apiKeyInput">RapidAPI Key</label><div class="api-key-row"><input id="apiKeyInput" type="password" autocomplete="off" spellcheck="false" placeholder="Paste API key"><button id="apiKeyToggle" type="button">Show</button></div></div><div class="api-key-actions"><button id="apiKeySave" class="api-key-save" type="button">Save & Test</button><button id="apiKeyClear" class="api-key-clear" type="button">Clear</button></div><div id="apiKeyStatus" class="api-key-status"><i></i><span>Using server configuration</span></div><div class="api-key-note">Stored only for this browser session. It is not written to GitHub or saved by StockSwap. For a production public app, keep the permanent key in Vercel instead.</div></div></div>`;

const script = `
<script id="api-settings-script">
(()=>{
  const STORAGE_KEY='stockswap_rapidapi_key';
  const nativeFetch=window.fetch.bind(window);
  const currentKey=()=>sessionStorage.getItem(STORAGE_KEY)||'';
  window.fetch=(input,init={})=>{
    const url=typeof input==='string'?input:(input&&input.url)||'';
    if(url.startsWith('/api/quotes')||url.startsWith('/api/chart')){
      const key=currentKey();
      if(key){
        const headers=new Headers(init.headers||{});
        headers.set('x-stockswap-api-key',key);
        init={...init,headers};
      }
    }
    return nativeFetch(input,init);
  };
  const top=document.querySelector('.top');
  const wallet=document.querySelector('#wallet');
  if(!top||!wallet)return;
  const right=document.createElement('div');
  right.className='api-right';
  const btn=document.createElement('button');
  btn.id='apiKeyButton';btn.className='api-key-btn';btn.type='button';btn.textContent='API';
  wallet.replaceWith(right);right.append(btn,wallet);
  document.body.insertAdjacentHTML('beforeend',${JSON.stringify(modal)});
  const modalEl=document.querySelector('#apiKeyModal'),input=document.querySelector('#apiKeyInput'),status=document.querySelector('#apiKeyStatus'),save=document.querySelector('#apiKeySave');
  const sync=()=>{const active=!!currentKey();btn.classList.toggle('active',active);status.classList.toggle('active',active);status.querySelector('span').textContent=active?'Browser API key active':'Using server configuration'};
  const open=()=>{input.value=currentKey();modalEl.classList.add('on');modalEl.setAttribute('aria-hidden','false');sync();setTimeout(()=>input.focus(),40)};
  const close=()=>{modalEl.classList.remove('on');modalEl.setAttribute('aria-hidden','true')};
  btn.onclick=open;document.querySelector('#apiKeyClose').onclick=close;modalEl.onclick=e=>{if(e.target===modalEl)close()};
  document.querySelector('#apiKeyToggle').onclick=()=>{const show=input.type==='password';input.type=show?'text':'password';document.querySelector('#apiKeyToggle').textContent=show?'Hide':'Show'};
  document.querySelector('#apiKeyClear').onclick=()=>{sessionStorage.removeItem(STORAGE_KEY);input.value='';sync();if(window.toast)window.toast('Browser API key cleared')};
  save.onclick=async()=>{const key=input.value.trim();if(!key)return;sessionStorage.setItem(STORAGE_KEY,key);sync();save.disabled=true;save.textContent='Testing…';try{const r=await fetch('/api/quotes?symbols=AAPL',{cache:'no-store'});if(!r.ok)throw new Error();const data=await r.json();if(!data.quotes||!data.quotes.length)throw new Error();save.textContent='Connected';setTimeout(()=>{save.textContent='Save & Test';save.disabled=false;close()},500)}catch(e){save.textContent='Test failed';save.disabled=false;setTimeout(()=>save.textContent='Save & Test',1400)}};
  sync();
})();
</script>`;

module.exports = function handler(req, res) {
  try {
    const file = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(file, 'utf8');
    html = html.replace('</head>', `${style}</head>`);
    html = html.replace('</body>', `${modal}${script}</body>`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).send('Unable to load StockSwap');
  }
};
