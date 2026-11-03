/* §1023 PC（2000×940）の現場一覧：2列×2段＝4現場が丸ごと見える（§1025 で6→4）・工事名が欠けない・下へ送ってもカードが組み立てられる。直す前の版は★NG。使い方: node _check/pc2col.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:2000,height:940},serviceWorkers:'block'});
await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3500);
const r=await p.evaluate(()=>{const R=e=>e.getBoundingClientRect();const L=document.getElementById('list'),lr=R(L);const cs=[...L.querySelectorAll('.pcard')];
 const vis=cs.filter(c=>{const q=R(c);return q.top>=lr.top-1&&q.bottom<=lr.bottom+1;});const cols=new Set(vis.map(c=>Math.round(R(c).left))).size;
 const ttl=vis.map(c=>c.querySelector('.rhead .ebox.ttl')).filter(t=>t.scrollHeight>t.clientHeight+2).length;
 return {vis:vis.length,cols,ttl};});
await p.evaluate(()=>{const L=document.getElementById('list');L.scrollTop=L.scrollHeight*0.6;});await p.waitForTimeout(1500);
const r2=await p.evaluate(()=>{const R=e=>e.getBoundingClientRect();const L=document.getElementById('list'),lr=R(L);const vis=[...L.querySelectorAll('.pcard')].filter(c=>{const q=R(c);return q.bottom>lr.top&&q.top<lr.bottom;});
 return {n:vis.length,built:vis.filter(c=>{const g=c.querySelector('.pcx');return g&&g.getBoundingClientRect().height>100;}).length};});
const ok=r.vis>=4&&r.cols===2&&r.ttl===0&&r2.n>0&&r2.built===r2.n;
console.log(ok?'○':'★NG','PC（2000×940）：2列×2段＝4現場が丸ごと見える（§1025 で6→4）・工事名が欠けない・下へ送ってもカードが組み立てられる',JSON.stringify({r,r2}));await b.close();})();
