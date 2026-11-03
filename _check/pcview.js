/* §1024 PC（2000×940）の現場一覧＝本人が選んだ案B：材料代・工賃・他／既存・構造・メモの段を出さない・見出しの地は薄い灰緑・カードの外は暗い・6現場が見える。
   使い方: node _check/pcview.js [kirokucho_demo.html]。直す前の版は★NG */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:2000,height:940},serviceWorkers:'block'});
await ctx.addInitScript(()=>{sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(3500);
const r=await p.evaluate(()=>{const R=e=>e.getBoundingClientRect();const L=document.getElementById('list'),lr=R(L);const c=L.querySelector('.pcard');
 const hidden=[...c.querySelectorAll('.pcx > .m2, .pcx > .pcx2c')].every(e=>getComputedStyle(e).display==='none')&&c.querySelectorAll('.pcx > .m2').length>0;
 const lab=c.querySelector('.pcx > .ebox > i');const bg=getComputedStyle(L).backgroundColor;const m=bg.match(/\d+/g).map(Number);
 const vis=[...L.querySelectorAll('.pcard')].filter(q=>{const x=R(q);return x.top>=lr.top-1&&x.bottom<=lr.bottom+1;}).length;
 return {hidden,lab:getComputedStyle(lab).backgroundColor,dark:(m[0]+m[1]+m[2])/3<90,vis};});
const ok=r.hidden&&r.lab==='rgb(242, 244, 241)'&&r.dark&&r.vis>=6;
console.log(ok?'○':'★NG','PCの現場一覧＝案B（項目を減らす・落ち着いた色・外を暗く・6現場）',JSON.stringify(r));await b.close();})();
