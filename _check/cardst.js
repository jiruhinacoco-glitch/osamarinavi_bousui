/* ★2026-10-30b 現場一覧のカードの「ステータス▾」で変えた値が、その場で端末に保存される（デバッグ巡回 A3）
   前は「保存しました（サンプルのため、再読み込みで元に戻ります）」と出て、すぐには保存していなかった（画面を離れるときにだけ保存）。
   ①カードで 見積済→契約済 に変える ②お知らせに「元に戻ります」が出ない ③その直後に保存データ（localStorage）に入っている ④開き直しても契約済
   使い方: node _check/cardst.js [ページ]（http://localhost:8899 で配信しておくこと）。直す前の版は②③④が落ちる */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0; const ok=(m,c,x)=>{console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,200):'')); if(!c)NG++;};
const PG=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.addInitScript(()=>{try{localStorage.setItem('nn_view_mode','mobile')}catch(_){}});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+PG); await p.waitForTimeout(1800);
await p.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.offsetParent&&e.textContent.trim()==='現場一覧'); b.click();}); await p.waitForFunction(()=>document.querySelectorAll('#list .pcard').length>=50,null,{timeout:15000}).catch(()=>{}); await p.waitForTimeout(800);   /* ★2026-11-03 一覧は14件→残りの2回に分けて組み立てる。全部そろうまで待つ */
const pick=await p.evaluate(()=>{const c=[...document.querySelectorAll('#list .pcard')].find(c=>{const s=c.querySelector('.stsel'); return s&&/^見積済/.test(s.textContent.trim());}); c.scrollIntoView({block:'start'}); const n=c.querySelector('.ptitle, .pname, input, h3'); return {pid:c.dataset.pid};});
await p.waitForTimeout(900);   /* ★スクロールが落ち着いてから測る */
const r=await p.evaluate(pid=>{const e=document.querySelector('#list .pcard[data-pid="'+pid+'"] .stsel').getBoundingClientRect(); return {x:e.left+e.width/2,y:e.top+e.height/2};},pick.pid);
await p.touchscreen.tap(r.x,r.y); await p.waitForTimeout(600);
await p.waitForFunction(()=>{const P=document.getElementById('nnSelPop');return P&&P.classList.contains('open');},null,{timeout:5000}).catch(()=>{});
const o=await p.evaluate(()=>{const e=[...document.querySelectorAll('#nnSelPop .o')].find(x=>x.textContent.trim()==='契約済')||[...document.querySelectorAll('body *')].filter(x=>x.children.length<=1&&x.offsetParent&&x.textContent.trim()==='契約済').pop();   /* ★2026-11-03 開いた一覧の中の選択肢を押す（画面全体から探すと別の「契約済」を拾った） */ e.scrollIntoView({block:'nearest'}); const q=e.getBoundingClientRect(); return {x:q.left+q.width/2,y:q.top+q.height/2};});
await p.touchscreen.tap(o.x,o.y); await p.waitForTimeout(800);
const t=await p.evaluate(()=>(document.getElementById('toast')||{}).textContent||'');
ok('①カードで契約済に変わる', await p.evaluate(pid=>document.querySelector('#list .pcard[data-pid="'+pid+'"] .stsel').textContent.trim().startsWith('契約済'),pick.pid));
ok('②「元に戻ります」と出ない', !/元に戻ります/.test(t), t);
const saved=await p.evaluate(pid=>{const d=JSON.parse(localStorage.getItem('nn_kirokucho_props_v1')||'{}'); const all=[...(d.add||[]),...Object.values(d.edit||{})].map(x=>{try{return JSON.parse(x)}catch(e){return null}}); const q=all.find(x=>x&&String(x.id)===String(pid)); return q?q.status:null;},pick.pid);
ok('③その場で端末に保存されている（画面を離れる前）', saved==='契約済', saved);
const st=await ctx.storageState(); await ctx.close();
const ctx2=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block',storageState:st}); const p2=await ctx2.newPage();
await p2.goto('http://localhost:8899/'+PG); await p2.waitForTimeout(1800);
await p2.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(e=>e.offsetParent&&e.textContent.trim()==='現場一覧'); b.click();}); await p2.waitForFunction(()=>document.querySelectorAll('#list .pcard').length>=50,null,{timeout:15000}).catch(()=>{}); await p2.waitForTimeout(800);
const after=await p2.evaluate(pid=>{const c=document.querySelector('#list .pcard[data-pid="'+pid+'"] .stsel'); return c?c.textContent.trim():null;},pick.pid);
ok('④開き直しても契約済', /^契約済/.test(after||''), after);
ok('JSエラーなし', errs.length===0, errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○'); await b.close();})();
