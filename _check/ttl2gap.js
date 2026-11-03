/* §1015 スマホ一覧：現場名が2行でも、見出しの行の下に白いすき間がない（見出しの下の線＝写真・屋根の欄の上）。直す前の版は★NG。使い方: node _check/ttl2gap.js [kirokucho_demo.html] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'kirokucho_demo.html';
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
await ctx.addInitScript(()=>{localStorage.setItem('nn_view_mode','mobile');sessionStorage.setItem('nn_vm_view','list');});
const p=await ctx.newPage();await p.goto('http://localhost:8899/'+FILE);await p.waitForTimeout(2500);
await p.evaluate(()=>{const K=Object.keys(KO_MASTER);const mk=(id,name,n)=>{const a=JSON.parse(JSON.stringify(props[0]));a.id=id;a.name=name;a.areas=[];for(let i=0;i<n;i++)a.areas.push({ko:K[1],mk:'田島ルーフィング',items:[{k:'平場',q:100,u:'㎡'}]});return a;};
 [6,2,1].forEach(n=>{props.unshift(mk(92100+n,'札幌市西区八軒アパート屋上防水改修工事その長い名前テスト',n));props.unshift(mk(92200+n,'短い名前',n));});selectedId=-1;render();showView('list');});await p.waitForTimeout(1500);
const r=await p.evaluate(()=>{const cs=[...document.querySelectorAll('#list .pcard')].slice(0,6);nnTtlFitSp(cs);const R=e=>e.getBoundingClientRect();return cs.map(c=>{const rh=c.querySelector('.rhead'),ph=c.querySelector('.pph'),pr=c.querySelector('.sproofs');
 const gapP=Math.round((R(ph).top-R(rh).bottom)*10)/10,gapR=pr?Math.round((R(pr).top-R(rh).bottom)*10)/10:null;return {n:c.querySelector('.rhead .ebox.ttl').textContent.trim().slice(0,4),rh:Math.round(R(rh).height*10)/10,gapP,gapR};});});
const bad=r.filter(o=>Math.abs(o.gapP)>0.6||(o.gapR!==null&&Math.abs(o.gapR)>0.6));
console.log(bad.length?'★NG':'○','現場名が1行でも2行でも、見出しの行の下に空白がない（見出しの下の線＝写真・屋根の欄の上）',JSON.stringify(r));await b.close();})();
