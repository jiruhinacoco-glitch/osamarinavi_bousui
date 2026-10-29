/* 表一覧（2026-10-30r 本人「左へ右へは要らない。1画面で列が見えるように」）：
   ①「◀左へ／右へ▶」が無い ②PC（幅1600）で最初に出る列が横にはみ出さない ③「表示項目」で列を足せる。使い方: node _check/rtfit.js [ページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1600,height:800},serviceWorkers:'block'});
await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','ichiran')}catch(_){}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(2000);
await p.evaluate(()=>showView('list')); await p.waitForTimeout(400);
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.offsetParent&&/表一覧/.test(e.textContent)); b.click();}); await p.waitForTimeout(1200);
const r=await p.evaluate(()=>{const S=document.getElementById('recordScroll'); return {lr:[...document.querySelectorAll('button')].some(e=>e.offsetParent&&/左へ|右へ/.test(e.textContent)), sw:S.scrollWidth, cw:S.clientWidth,
  n:document.querySelectorAll('#recordTable thead th').length};});
ok('「左へ／右へ」が無い', !r.lr);
ok('最初の列が横にはみ出さない（'+r.n+'列）', r.sw<=r.cw+1, r);
const t=await p.evaluate(()=>{const b=document.getElementById('recordFieldsToggle'); if(!b||!b.offsetParent) return false; b.click(); return true;}); await p.waitForTimeout(300);
ok('「表示項目」ボタンが見える', t);
if(t){ await p.evaluate(()=>{const i=document.querySelector('#recordFields input[value="tantou"]'); i.checked=true; i.dispatchEvent(new Event('change',{bubbles:true}));}); await p.waitForTimeout(800);
  ok('「表示項目」で担当者の列を足せる', await p.evaluate(()=>[...document.querySelectorAll('#recordTable thead th')].some(e=>/担当者/.test(e.textContent)))); }
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
