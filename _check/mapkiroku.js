/* A5（第1段・現場マップ）：記録帳で足した・名前を直した・消した物件が、現場マップの一覧にも反映される。
   記録帳を本当に操作して保存 → 地図を開いて SITES と一覧の件数を見る。使い方: node _check/mapkiroku.js [地図のページ]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'genba_map_v36.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:1280,height:860},serviceWorkers:'block'});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(1800);
/* 足す */
await p.evaluate(()=>openModal()); await p.waitForTimeout(500);
await p.fill('#f_name','検査 地図に出る物件'); await p.fill('#f_addr','札幌市西区琴似2条1丁目');
await p.evaluate(()=>{const b=[...document.querySelectorAll('.modal-bg.open button')].find(e=>e.textContent.trim()==='保存する'); b.click();}); await p.waitForTimeout(1200);
/* 名前を直す（2番）・消す（3番） */
await p.evaluate(()=>openModal(2)); await p.waitForTimeout(500); await p.fill('#f_name','検査 名前を直した2番');
await p.evaluate(()=>{const b=[...document.querySelectorAll('.modal-bg.open button')].find(e=>e.textContent.trim()==='保存する'); b.click();}); await p.waitForTimeout(1200);
await p.evaluate(()=>{openModal(3);}); await p.waitForTimeout(500); await p.evaluate(()=>nnDeleteProp()); await p.waitForTimeout(800);
const kn=await p.evaluate(()=>props.length);
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(2500);
const r=await p.evaluate(()=>({n:SITES.length, add:SITES.find(s=>s.name==='検査 地図に出る物件'), two:(SITES.find(s=>s.id===2)||{}).name, three:!!SITES.find(s=>s.id===3),
  list:document.body.innerText.includes('検査 地図に出る物件')}));
ok('記録帳と同じ件数（'+kn+'件）', r.n===kn+0||r.n===kn, {map:r.n,kiroku:kn});
ok('足した物件が地図の現場に入り、一覧にも出る', !!r.add&&r.list, r.add);
ok('足した物件の位置は西区あたり', r.add&&Math.abs(r.add.lat-43.075)<0.02&&Math.abs(r.add.lng-141.302)<0.02, r.add&&[r.add.lat,r.add.lng]);
ok('直した名前が地図にも出る', r.two==='検査 名前を直した2番', r.two);
ok('消した物件は地図にも出ない', !r.three);
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
