const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
// ① データが無い＝出ない
await p.goto('http://localhost:8899/index.html'); await p.waitForTimeout(1600);
ok(await p.evaluate(()=>!document.getElementById('nnBkNag')),'データが無いときは促しを出さない');
// ② データがある＆バックアップ記録なし＝出る
await p.evaluate(()=>{ localStorage.setItem('nn_kirokucho_def_v1','{}'); });
await p.reload(); await p.waitForTimeout(1600);
const nag=await p.evaluate(()=>{const d=document.getElementById('nnBkNag');
  if(!d) return null; const r=d.getBoundingClientRect();
  const nav=document.querySelector('nav').getBoundingClientRect();
  return {show:true, bottom:Math.round(r.bottom), navTop:Math.round(nav.top), overlap:r.bottom>nav.top};});
ok(nag&&nag.show,'30日以上していない＆データあり＝促しが出る',nag);
ok(nag&&!nag.overlap,'下部ナビに重ならない',nag);
// ③ あとで＝消える・7日出ない
await p.evaluate(()=>document.getElementById('nnBkLater').click()); await p.waitForTimeout(300);
ok(await p.evaluate(()=>!document.getElementById('nnBkNag')),'「あとで」で消える');
await p.reload(); await p.waitForTimeout(1500);
ok(await p.evaluate(()=>!document.getElementById('nnBkNag')),'あとで＝7日間は出ない');
// ④ バックアップ済みなら出ない
await p.evaluate(()=>{ localStorage.removeItem('nn_bk_snooze'); localStorage.setItem('nn_bk_last', String(Date.now())); });
await p.reload(); await p.waitForTimeout(1500);
ok(await p.evaluate(()=>!document.getElementById('nnBkNag')),'バックアップ済み（30日以内）なら出ない');
// ⑤ persist が呼ばれている（存在すれば）
ok(await p.evaluate(()=>!!document.getElementById('nn-persist-js')),'persist の頼みが入っている（全ページ共通の型）');
ok(errs.length===0,'JSエラーなし',errs);
await b.close(); process.exit(ng?1:0);
})();
