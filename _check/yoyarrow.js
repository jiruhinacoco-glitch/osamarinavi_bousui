/* §1013 スマホのダッシュボード：前年同期の「＋◯％」にPCと同じ矢印の絵があり、枠からはみ出さない。使い方: node _check/yoyarrow.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','dash');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+(process.argv[2]||'kirokucho_demo.html'));await p.waitForTimeout(3000);
const r=await p.evaluate(()=>{const ys=[...document.querySelectorAll('#dashboard .kgrps .yoy')];return ys.map(y=>{const v=y.querySelector('.yoyv');const cs=getComputedStyle(v,'::before');const c=y.closest('.kcell').getBoundingClientRect(),q=y.getBoundingClientRect();
 return {pos:y.classList.contains('positive'),img:/svg/.test(cs.backgroundImage),w:parseFloat(cs.width)||0,fit:q.left>=c.left-0.5&&q.right<=c.right+0.5&&v.getBoundingClientRect().right<=c.right+0.5};});});
const bad=r.filter(o=>!o.img||o.w<6||!o.fit);
console.log(r.length&&!bad.length?'○':'★NG','スマホのダッシュボード：前年同期の「＋◯％」に矢印の絵があり、枠からはみ出さない',JSON.stringify({n:r.length,bad}));await b.close();})();
