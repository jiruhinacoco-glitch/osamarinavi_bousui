/* カメラ→写真台帳を作成（PC）：左のメニュー（#nav）が隠れない（2026-11-16m）。直す前の版では★NG。
   ①写真台帳の画面を開いても、左のメニューの真ん中で、いちばん手前にあるのがメニュー ②写真台帳の画面はメニューの右はしから始まる
   使い方: node _check/dbvnav.js [camera.html]   （http://localhost:8899 が要る） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const FILE=process.argv[2]||'camera.html'; let NG=0;
const ok=(c,n,d)=>{console.log((c?'○':'★NG')+' '+n+(d!==undefined?'  '+JSON.stringify(d).slice(0,230):'')); if(!c)NG++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await b.newPage({viewport:{width:1900,height:950}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/'+FILE); await p.waitForFunction(()=>typeof nnDaichoOpen==='function'); await p.waitForTimeout(1200);
await p.evaluate(()=>{ const d=document.getElementById('dbv'); if(typeof nnDaichoStart==='function') nnDaichoStart(); else { d.style.display='flex'; d.classList.add('open'); } try{ nnDaichoOpen(); }catch(e){} });
await p.waitForFunction(()=>{ const d=document.getElementById('dbv'); return d&&getComputedStyle(d).display!=='none'; },null,{timeout:5000}).catch(()=>{});
await p.waitForTimeout(600);
const r=await p.evaluate(()=>{ const n=document.getElementById('nav'), d=document.getElementById('dbv'); const q=n.getBoundingClientRect(), dq=d.getBoundingClientRect();
  const pts=[0.3,0.5,0.7].map(f=>{ const t=document.elementFromPoint(q.left+q.width/2,q.top+q.height*f); return !!(t&&n.contains(t)); });
  return {shown:getComputedStyle(d).display!=='none', pts, navR:Math.round(q.right), dbvL:Math.round(dq.left)};});
ok(r.shown&&r.pts.every(Boolean),'①写真台帳の画面を開いても、左のメニューが手前に見えている',r);
ok(r.shown&&Math.abs(r.dbvL-r.navR)<=2,'②写真台帳の画面はメニューの右はしから始まる',{nav右:r.navR,台帳左:r.dbvL});
ok(errs.length===0,'エラーが出ていない',errs.slice(0,2));
await b.close(); console.log(NG?('★NG '+NG):'すべて○'); process.exit(NG?1:0);
})();
