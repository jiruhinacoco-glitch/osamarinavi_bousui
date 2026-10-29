/* B2：一覧カードの「状態▾」の選択肢が、仕事の進む順（引合い→完成）になっているか。
   使い方: node _check/cardstord.js [ページ]（http://localhost:8899 で配信しておくこと）。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(_){}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1800);
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.offsetParent&&e.textContent.trim()==='現場一覧'); b.click();}); await p.waitForTimeout(1000);
const r=await p.evaluate(()=>{const e=document.querySelector('#list .pcard .stsel'); e.scrollIntoView({block:'center'}); const q=e.getBoundingClientRect(); return {x:q.left+q.width/2,y:q.top+q.height/2};});
await p.waitForTimeout(300); await p.touchscreen.tap(r.x,r.y); await p.waitForTimeout(600);
const got=await p.evaluate(()=>{const s=document.querySelector('#list .pcard .stsel select'); return s?[...s.options].map(o=>o.value):null;});
const want=['引合いあり','見積済(調査済)','見積済','契約済','施工中','完成済'];   /* 編集画面 #f_st と同じ並び（自分で書いた正解） */
ok('カードの状態▾が 引合い→完成 の順', JSON.stringify(got)===JSON.stringify(want), got);
const modal=await p.evaluate(()=>[...document.querySelectorAll('#f_st option')].map(o=>o.value));
ok('編集画面と同じ並び', JSON.stringify(got)===JSON.stringify(modal));
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
