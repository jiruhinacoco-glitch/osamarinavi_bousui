/* ★2026-08-24i 長時間の操作でメモリが増えないか（フリーズ・落ちる・黒くなるの再発防止・§178）
   node _check/stress3d.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1400,height:820}})).newPage();
p.on('dialog',d=>d.accept());
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
let lost=0; p.on('console',m=>{ if(/context lost|CONTEXT_LOST/i.test(m.text())) lost++; });
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1400); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ state.polys=[];state.scaleM=1;drawPts=[{x:0,y:0},{x:30,y:0},{x:30,y:16},{x:0,y:16}]; closePoly(); setTool('sel'); });
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(4500);
const snap=()=>p.evaluate(()=>({geo:T.renderer.info.memory.geometries,
  tex:T.renderer.info.memory.textures, prog:T.renderer.info.programs.length,
  heap:Math.round((performance.memory?performance.memory.usedJSHeapSize:0)/1048576),
  bead:_nnBeadCache.size, mat:_nnMatCache.size, ctx:T.renderer.getContext().isContextLost()}));
console.log('開始', await snap());
for(let round=1; round<=6; round++){
  await p.evaluate(()=>{
    const el=T.renderer.domElement, r=el.getBoundingClientRect();
    const cx=r.left+r.width/2, cy=r.top+r.height/2;
    const ev=(t,x,y)=>el.dispatchEvent(new PointerEvent(t,{clientX:x,clientY:y,pointerId:1,
      pointerType:'mouse',bubbles:true,cancelable:true,buttons:1}));
    for(let k=0;k<10;k++){
      ev('pointerdown',cx,cy);
      for(let i=0;i<30;i++) ev('pointermove',cx,cy-(i%12));
      ev('pointerup',cx,cy);
    }
    /* 高さの入力・工法切替・タブ往復も混ぜる */
    for(let k=0;k<10;k++){ nnLvLive(0, String((k%5)*0.2), 1); }
    state.specCode=(state.specCode==='AS-T1')?'X-2':'AS-T1';
    dirty3d=true; build3D();
  });
  await p.waitForTimeout(500);
  await p.evaluate(()=>setTab('zu')); await p.waitForTimeout(200);
  await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(600);
  console.log('周回'+round, await snap());
}
console.log('JSエラー', errs.length, errs.slice(0,2));
console.log('コンテキスト喪失', lost);
await b.close();})();
