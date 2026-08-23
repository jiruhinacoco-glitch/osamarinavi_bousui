/* ★2026-08-24h 3Dの重さ・GPUメモリ漏れの検証（§177）
   node _check/perf3d.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):''));if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1400,height:820}})).newPage();
p.on('dialog',d=>d.accept()); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ state.polys=[];state.scaleM=1;state.specCode='AS-T1';
  drawPts=[{x:0,y:0},{x:30,y:0},{x:30,y:16},{x:0,y:16}]; closePoly(); });
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4500);
const info=()=>p.evaluate(()=>({geo:T.renderer.info.memory.geometries,
  tex:T.renderer.info.memory.textures, children:T.group.children.length}));
const a=await info();
await p.evaluate(()=>{ for(let i=0;i<30;i++){ dirty3d=true; build3D(); } });
const c=await info();
ok(c.geo<=a.geo+4,'★30回組み直してもGPUの形が増えない（メモリ漏れなし＝黒くならない）',{前:a.geo,後:c.geo});
ok(c.tex<=8,'質感（テクスチャ）も増えない',c.tex);
const t=await p.evaluate(()=>{ const t0=performance.now();
  for(let i=0;i<30;i++){ dirty3d=true; build3D(); } return Math.round((performance.now()-t0)/30); });
ok(t<=15,'★組み直し1回が15ms以内（以前は54ms）',t+'ms');
const heap=await p.evaluate(()=>Math.round((performance.memory?performance.memory.usedJSHeapSize:0)/1048576));
ok(heap<40,'JSメモリが40MB未満（以前は67MB）',heap+'MB');
/* 形の使い回しで向き・太さが壊れていないこと（共有の形を rotate/scale しない） */
const bd=await p.evaluate(()=>{ const g1=nnBeadGeomT(1.0,0.006,'z',0.52);
  const g2=nnBeadGeomT(1.0,0.006,'z',0.52);
  g1.computeBoundingBox(); const bb=g1.boundingBox;
  return {同じ物:g1===g2, 長さ:+(bb.max.x-bb.min.x).toFixed(2), 高さ:+(bb.max.y-bb.min.y).toFixed(4)}; });
ok(bd['同じ物']===true,'同じ形は使い回している',bd);
ok(Math.abs(bd['長さ']-1.0)<0.05,'使い回しても長さが狂わない',bd['長さ']);
await p.evaluate(()=>{ for(let i=0;i<5;i++) nnBeadGeomT(1.0,0.006,'z',0.52); });
const bd2=await p.evaluate(()=>{ const g=nnBeadGeomT(1.0,0.006,'z',0.52);
  g.computeBoundingBox(); const bb=g.boundingBox;
  return {長さ:+(bb.max.x-bb.min.x).toFixed(2), 高さ:+(bb.max.y-bb.min.y).toFixed(4)}; });
ok(Math.abs(bd2['長さ']-bd['長さ'])<0.001 && Math.abs(bd2['高さ']-bd['高さ'])<0.0001,
   '★何度呼んでも形が変わらない（共有物を壊していない）',{前:bd,後:bd2});
ok(await p.evaluate(()=>typeof nnBuild3DSoon==='function'),'ドラッグ中の組み直しをまとめる仕組みがある');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
