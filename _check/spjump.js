/* §1029 スマホ一覧：開いて最初に下のカードへ一気に送ったとき、固まる時間が2秒未満（直す前は約4.3秒＝カードの文字合わせを1枚ずつ0.5pxずつ測っていた）。
   使い方: node _check/spjump.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');window.__lt=0;new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt+=e.duration)).observe({type:'longtask',buffered:true});});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(4000);
await p.waitForFunction(()=>document.querySelectorAll('#list .pcard').length>=50);await p.waitForTimeout(3000);
const a=await p.evaluate(()=>window.__lt);await p.evaluate(()=>document.querySelectorAll('#list .pcard')[10].scrollIntoView({block:'start'}));await p.waitForTimeout(3500);
const c=await p.evaluate(()=>window.__lt);const built=await p.evaluate(()=>{const L=document.getElementById('list'),lb=L.getBoundingClientRect();return [...L.querySelectorAll('.pcard')].filter(x=>{const r=x.getBoundingClientRect();return r.bottom>lb.top&&r.top<lb.bottom;}).every(x=>x.querySelector('.sproofs'));});
const ms=Math.round(c-a);console.log(ms<2000&&built?'○':'★NG','スマホ：下のカードへ一気に送っても固まりが2秒未満・見えるカードは組み立て済み',JSON.stringify({ms,built}));await b.close();})();
