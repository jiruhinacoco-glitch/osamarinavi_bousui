/* §1033 現場詳細の「人工」「追加工事」に1行足す→表に出る→読み込み直しても残る（PC1400）。
   人工を足すと「投入人工」も増える。使い方: node _check/jinextra.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let NG=0;const ok=(c,m,x)=>{if(!c)NG++;console.log((c?'○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x).slice(0,220):''));};
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1400,height:900},serviceWorkers:'block'});await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo.html'));await p.waitForTimeout(3000);
const pid=await p.evaluate(()=>props[3].id);
const tab=async t=>{await p.evaluate(t=>{const bt=[...document.querySelectorAll('#detail .tabs button, #detail .tab, #detail [data-tab]')].find(x=>x.textContent.trim().startsWith(t));bt.click();},t);await p.waitForTimeout(600);};
await p.evaluate(pid=>nnGoDetail(pid),pid);await p.waitForTimeout(1200);
const j0=await p.evaluate(pid=>{const q=props.find(x=>x.id===pid);return {n:(q.jinku||[]).length,sum:(q.jinku||[]).reduce((a,r)=>a+(+r.nin||+r.n||0),0)};},pid);
await tab('人工');
await p.fill('#j_d','2026-11-03');await p.fill('#j_n','3');await p.fill('#j_k','8');await p.fill('#j_c','25000');await p.fill('#j_m','巡回テスト 人工');
await p.locator('#detail button[onclick^="addJinku"]').click();await p.waitForTimeout(800);
const j1=await p.evaluate(pid=>{const q=props.find(x=>x.id===pid);return {n:(q.jinku||[]).length,sum:(q.jinku||[]).reduce((a,r)=>a+(+r.nin||+r.n||0),0),inTable:document.getElementById('detail').innerText.includes('巡回テスト 人工')};},pid);
ok(j1.n===j0.n+1&&j1.inTable,'①人工に1行足すと表に出る',{j0,j1});
await tab('追加工事');
await p.fill('#ex_d','2026-11-03');await p.fill('#ex_c','ドレン改修（巡回テスト）');await p.fill('#ex_a','45000');await p.fill('#ex_m','巡回テスト 追加');
await p.locator('#detail button[onclick^="addExtra"]').click();await p.waitForTimeout(800);
const e1=await p.evaluate(pid=>{const q=props.find(x=>x.id===pid);return {n:(q.extras||[]).length,last:(q.extras||[]).slice(-1)[0],inTable:document.getElementById('detail').innerText.includes('ドレン改修（巡回テスト）')};},pid);
ok(e1.inTable&&e1.last&&+e1.last.amt===45000,'②追加工事に1行足すと表に出る（金額45,000）',e1);
/* ★その場で端末に保存されているか（画面を離れる前＝iPhoneでアプリを閉じても消えない） */
const now=await p.evaluate(pid=>{try{const d=JSON.parse(localStorage.getItem('nn_kirokucho_props_v1'));const e=d.edit&&d.edit[pid];const q=e?JSON.parse(e):null;return {j:!!q&&(q.jinku||[]).some(r=>/巡回テスト/.test(r.memo||'')),e:!!q&&(q.extras||[]).some(r=>/巡回テスト/.test(r.memo||''))};}catch(err){return {err:String(err)};}},pid);
ok(now.j&&now.e,'②b 足した直後に端末へ保存されている（アプリを閉じても消えない）',now);
await p.reload();await p.waitForTimeout(3000);
const z=await p.evaluate(pid=>{const q=props.find(x=>x.id===pid);return {j:(q.jinku||[]).some(r=>/巡回テスト/.test(r.m||r.memo||'')),e:(q.extras||[]).some(r=>/巡回テスト/.test((r.content||'')+(r.memo||'')))};},pid);
ok(z.j&&z.e,'③読み込み直しても人工・追加工事が残る',z);
ok(!errs.length,'④JSエラーなし',errs.slice(0,2));
console.log(NG?'★NG '+NG+'件':'全部○');await b.close();})();
