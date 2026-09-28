/* ★2026-09-28d 荷揚げ（材料の荷姿を3Dに置く）／材料量の表示と座標軸の重なり（§537）
   node _check/nizumi.js [zumen_sekisan.html]   前提： python3 -m http.server 8899 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const F=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,d)=>{ console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):'')); if(!c)ng++; };
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:2000,height:1000}})).newPage(); p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
try{
await p.goto('http://localhost:8899/'+F,{waitUntil:'load'}); await p.waitForTimeout(1200);
await p.evaluate(()=>{ ['nn_specs_v1','nn_materials_v1','nn_matqty_mode','nn_matqty_pos'].forEach(k=>localStorage.removeItem(k)); try{nnZMenuClose();}catch(_){}});
/* 10m×8m・立上り300・天端250・AS-T1 */
await p.evaluate(()=>{ state.scaleM=1; state.polys=[]; state.parts=[]; state.d3sol=[]; state.d3sheet=[]; state.specCode='AS-T1';
  const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
  state.polys.push({name:'A',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}); saveState(); recalc(); draw(); });
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(3000);
const E=await p.evaluate(()=>{ const d=nnEstimateData(); return d.hira+d.tachi+d.tenba; });
const want={can:Math.ceil(E*0.2/17)+Math.ceil(E*0.5/18), roll:Math.ceil(E*1.1/8)*2};
/* ① 3Dの材料量の表示に「📦 荷揚げを置く」があり、押して屋根をタップすると置ける */
const has=await p.evaluate(()=>!!document.querySelector('#nnMatQty [data-a=niz]'));
ok(has,'材料量の表示に「📦 荷揚げを置く」がある');
await p.evaluate(()=>{ document.querySelector('#nnMatQty [data-a=niz]').click(); nnPlaceAtGrid(5,4); });
await p.waitForTimeout(2500);
const cnt=async()=>p.evaluate(()=>{ let can=0, roll=0, pal=0; T.group.traverse(o=>{ if(o.userData.partIdx==null) return;
  const k=o.userData.nzItem; if(k==='can') can++; if(k==='roll') roll++; if(k==='pallet') pal++; }); return {can,roll,pal}; });
let c=await cnt();
ok(c.can===want.can,'一斗缶の数＝プライマー＋仕上塗料の缶数（'+want.can+'）',c);
ok(c.roll===want.roll,'立てたロールの数＝下張り＋砂付の巻数（'+want.roll+'）',c);
ok(c.pal===4,'材料ごとにパレット（4枚）',c);
ok(await p.evaluate(()=>!(document.getElementById('nnPartsQt')||{textContent:''}).textContent.includes('荷揚げ')&&!nnEstimateData().parts.some(x=>/荷揚げ/.test(x.n))),'荷揚げは積算・見積に入らない');
/* ② 数量が変わると組み直す（自社仕様＝プライマーだけ） */
await p.evaluate(()=>{ localStorage.setItem('nn_specs_v1', JSON.stringify({v:1,items:[{id:'x1',code:'AS-T1',updatedAt:Date.now(),steps:[{w:'プライマー塗り',matId:'M003',u:0.2}]}]})); recalc(); });
await p.waitForTimeout(2500);
c=await cnt();
ok(c.can===Math.ceil(E*0.2/17)&&c.roll===0,'数量が変わると荷揚げも変わる（缶'+Math.ceil(E*0.2/17)+'・ロール0）',c);
await p.evaluate(()=>{ localStorage.removeItem('nn_specs_v1'); recalc(); }); await p.waitForTimeout(1500);
/* ③ 材料量の表示：くわしくを開いても座標軸（XYZ）の上に出ている（重なっても隠れない） */
await p.evaluate(()=>{ const d=document.getElementById('nnMatQty'); if(!d.classList.contains('open')) d.querySelector('.mh b').click(); });
await p.waitForTimeout(400);
const ov=await p.evaluate(()=>{ const d=document.getElementById('nnMatQty'), g=document.getElementById('nnAxisGiz');
  const r=d.getBoundingClientRect(), q=g&&g.classList.contains('on')?g.getBoundingClientRect():null;
  let covered=false; if(q){ const x=Math.max(r.left,q.left)+4, y=Math.max(r.top,q.top)+4; if(x<Math.min(r.right,q.right)&&y<Math.min(r.bottom,q.bottom)){ const e=document.elementFromPoint(x,y); covered=!!(e&&e.closest('#nnAxisGiz')); } }
  const md=d.querySelector('.md').getBoundingClientRect();
  return {covered, mdBottom:Math.round(md.bottom), gTop:q?Math.round(q.top):null, inter:!!q&&r.right>q.left&&r.left<q.right&&md.bottom>q.top+1&&r.top<q.bottom}; });
ok(!ov.covered,'重なっても材料量の表示が座標軸の手前に出る',ov);
ok(!ov.inter,'くわしくの内わけは座標軸の手前で止まる（中でスクロール）',ov);
/* ④ ✥ をつかんで動かせる・位置を覚える・2回タップで元へ */
const mv=await p.evaluate(()=>{ const r=document.querySelector('#nnMatQty .mv').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
const r0=await p.evaluate(()=>{ const r=document.getElementById('nnMatQty').getBoundingClientRect(); return {x:r.left,y:r.top}; });
await p.mouse.move(mv.x,mv.y); await p.mouse.down(); await p.mouse.move(mv.x-400,mv.y+300,{steps:6}); await p.mouse.up(); await p.waitForTimeout(300);
const r1=await p.evaluate(()=>{ const r=document.getElementById('nnMatQty').getBoundingClientRect(); return {x:r.left,y:r.top, saved:localStorage.getItem('nn_matqty_pos')}; });
ok(Math.abs((r1.x-r0.x)+400)<3&&Math.abs((r1.y-r0.y)-300)<3&&!!r1.saved,'✥ で動かせて位置を覚える',{r0,r1});
await p.evaluate(()=>{ recalc(); }); await p.waitForTimeout(400);
const r2=await p.evaluate(()=>{ const r=document.getElementById('nnMatQty').getBoundingClientRect(); return {x:r.left,y:r.top}; });
ok(Math.abs(r2.x-r1.x)<2&&Math.abs(r2.y-r1.y)<2,'描き直しても動かした位置のまま',r2);
const mv2=await p.evaluate(()=>{ const r=document.querySelector('#nnMatQty .mv').getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
await p.mouse.click(mv2.x,mv2.y); await p.waitForTimeout(80); await p.mouse.click(mv2.x,mv2.y); await p.waitForTimeout(300);
const r3=await p.evaluate(()=>{ const r=document.getElementById('nnMatQty').getBoundingClientRect(); return {x:r.left,y:r.top,saved:localStorage.getItem('nn_matqty_pos')}; });
ok(Math.abs(r3.x-r0.x)<3&&Math.abs(r3.y-r0.y)<3&&!r3.saved,'✥ を2回タップで元の位置へ',r3);
ok(errs.length===0,'JSエラーなし',errs.slice(0,3));
await p.evaluate(()=>{ ['nn_matqty_mode','nn_matqty_pos'].forEach(k=>localStorage.removeItem(k)); });
}catch(e){ ok(false,'途中で止まった（機能が無い）',String(e.message).slice(0,120)); }
console.log('★NG',ng); await b.close();
})();
