/* ★2026-08-24h 3Dの重さ・GPUメモリ漏れの検証（§177）
   node _check/perf3d.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):''));if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1400,height:820}})).newPage();
p.on('dialog',d=>d.accept()); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{ window.__nnSh=0;
  const C=WebGL2RenderingContext.prototype, cs=C.compileShader;
  C.compileShader=function(){ window.__nnSh++; return cs.apply(this,arguments); }; });
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ state.polys=[];state.scaleM=1;state.specCode='AS-T1';
  drawPts=[{x:0,y:0},{x:30,y:0},{x:30,y:16},{x:0,y:16}]; closePoly(); });
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4500);
/* ★2026-09-02b 屋根の質感（§255）と空（§265③）はあとから届く。
   届く前に数えると「増えた」と誤判定するので、そろってから測り始める。 */
await p.waitForFunction(()=>{ try{ return nnRoofTexState('as_new')>=2 && !!T.scene.environment; }
  catch(_){ return false; } },null,{timeout:20000}).catch(()=>{});
await p.waitForTimeout(1500);
const info=()=>p.evaluate(()=>({geo:T.renderer.info.memory.geometries,
  tex:T.renderer.info.memory.textures, children:T.group.children.length}));
const a=await info();
await p.evaluate(()=>{ for(let i=0;i<30;i++){ dirty3d=true; build3D(); } });
const c=await info();
ok(c.geo<=a.geo+4,'★30回組み直してもGPUの形が増えない（メモリ漏れなし＝黒くならない）',{前:a.geo,後:c.geo});
/* ★2026-09-02a 屋根の質感（§255）が入って枚数そのものは増えたので、
   「何枚あるか」ではなく「組み直しで増えないか」で見る（漏れの検出はこちらが本筋） */
ok(c.tex<=a.tex+1,'質感（テクスチャ）も増えない',{前:a.tex,後:c.tex});
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
/* ★シェーダーの作り直しが起きていないこと（フリーズの本当の原因） */
const sh=await p.evaluate(()=>{ const a=window.__nnSh|0;
  for(let i=0;i<5;i++){ dirty3d=true; build3D(); T.renderer.render(T.scene,T.camera); }
  return (window.__nnSh|0)-a; });
ok(sh===0,'★組み直してもシェーダーを作り直さない（ドラッグのフリーズ対策）',sh);
/* ドラッグ60コマの処理時間 */
const dg=await p.evaluate(async()=>{
  const el=T.renderer.domElement, r=el.getBoundingClientRect();
  const cx=r.left+r.width/2, cy=r.top+r.height/2;
  const ev=(t,x,y)=>el.dispatchEvent(new PointerEvent(t,{clientX:x,clientY:y,pointerId:1,
    pointerType:'mouse',bubbles:true,cancelable:true,buttons:1}));
  try{ setTool('sel'); }catch(_){}
  ev('pointerdown',cx,cy);
  const t0=performance.now();
  for(let i=0;i<60;i++) ev('pointermove',cx,cy-i);
  const ms=performance.now()-t0;
  ev('pointerup',cx,cy-60);
  await new Promise(z=>setTimeout(z,300));
  return Math.round(ms);
});
ok(dg<300,'★ドラッグ60コマの処理が300ms以内（以前は数十秒）',dg+'ms');
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
