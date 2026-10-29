/* ★2026-10-29ze 下のメニューが自動で隠れた（5秒さわらない）あと、右下の▲（#navShowTab）が出て押せるか（全ページ・スマホ縦）
   本人「仕様・材料のときメインアイコンを呼び出すボタンがない」：入口の画面（body.nn-pick）の「ほかを隠す」指定が▲まで隠していた（§896）
   ①メニューが隠れたら▲が見えて、真ん中を指すと▲が取れる ②▲を押すとメニューが戻る
   使い方: node _check/showtab.js（http://localhost:8899 で配信しておくこと）。直す前の版は shiyo_toroku が落ちる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); if(!c)NG++;};
const PAGES=process.argv[2]?[process.argv[2]]:['kirokucho_demo','zumen_sekisan','genba_map_v36','hacchu','kokkosho','camera','library','shiyo_toroku','yougo','zairyo_toroku'];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const pg of PAGES){
 const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('http://localhost:8899/'+pg+'.html');
 await p.waitForFunction(()=>{const t=document.getElementById('navShowTab'); return t&&t.style.display==='block';},null,{timeout:12000}).catch(()=>{});
 await p.waitForTimeout(400);
 const r=await p.evaluate(()=>{const t=document.getElementById('navShowTab'); if(!t) return {none:true}; const q=t.getBoundingClientRect(); const e=q.width?document.elementFromPoint(q.left+q.width/2,q.top+q.height/2):null; return {w:Math.round(q.width), hit:e===t, x:q.left+q.width/2, y:q.top+q.height/2};});
 ok(pg+' ①メニューが隠れたら▲が見えて押せる', !r.none&&r.w>0&&r.hit, r);
 if(r.hit){ await p.touchscreen.tap(r.x,r.y); await p.waitForTimeout(800);
   const back=await p.evaluate(()=>{const n=document.querySelector('nav#nav')||document.querySelector('nav'); return n.getBoundingClientRect().top<document.documentElement.clientHeight-20;});
   ok(pg+' ②▲を押すとメニューが戻る', back); }
 ok(pg+' JSエラーなし', errs.length===0, errs.slice(0,2));
 await ctx.close(); }
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
