/* 道具：全11ページの見出し（header）で、絵・題名とボタンの重なり、見出しの字の切れを数える（○／★NGなし）。§1276・§1281・§1282
   使い方: node _check/_tools/khead.js */
const {chromium,devices}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [nm,o] of [['ipad',{...devices['iPad (gen 7)']}],['ipadL',{...devices['iPad (gen 7) landscape']}],['sp360',{...devices['Galaxy S8']}]]){ const ctx=await b.newContext(o);
for(const pg of ['index','kirokucho_demo','hacchu','genba_map_v36','kokkosho','camera','library','shiyo_toroku','yougo','zairyo_toroku','zumen_sekisan']){ const p=await ctx.newPage(); await p.goto('http://localhost:8899/'+pg+'.html'); await p.waitForTimeout(2200);
 const r=await p.evaluate(()=>{ const h=document.querySelector('body > header'); if(!h) return 'headerなし'; const vis=e=>{const q=e.getBoundingClientRect(); const c=getComputedStyle(e); return q.width>0&&q.height>0&&c.visibility!=='hidden'&&c.display!=='none';}; const pics=[...h.querySelectorAll('.hicon, .hicon img, h1')].filter(vis); const bts=[...h.querySelectorAll('button, .count, a')].filter(vis).filter(e=>!e.closest('.hicon')&&!e.classList.contains('nn-back')); const hits=[];
  pics.forEach(a=>{ const A=a.getBoundingClientRect(); bts.forEach(x=>{ const B=x.getBoundingClientRect(); const ox=Math.min(A.right,B.right)-Math.max(A.left,B.left), oy=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top); if(ox>4&&oy>4) hits.push((a.tagName==='H1'?'題':'絵')+'×'+x.textContent.trim().slice(0,8)); }); });
  const t=[...h.querySelectorAll('*')].filter(e=>vis(e)&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&e.scrollWidth>e.clientWidth+3&&/(hidden|clip)/.test(getComputedStyle(e).overflowX)).map(e=>e.textContent.trim().slice(0,8));
  return [...new Set(hits)].join(',')+(t.length?' 切れ:'+t.join(','):''); });
 if(r) console.log(nm,pg,r); await p.close(); }
await ctx.close(); }
await b.close();})();
