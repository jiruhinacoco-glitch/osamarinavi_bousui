/* ★2026-08-24j 継目の「まとめ描き」（同じ形を1回で描く・§179）
   node _check/inst3d.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,d)=>{console.log((c?'  ○ ':'  ★NG ')+m+(d!==undefined?'  '+JSON.stringify(d):''));if(!c)ng++;};
(async()=>{
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await (await b.newContext({viewport:{width:1400,height:820}})).newPage();
p.on('dialog',d=>d.accept()); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
await p.waitForTimeout(1400); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
await p.evaluate(()=>{ state.polys=[]; state.scaleM=0.5;
  for(let k=0;k<20;k++){ const ox=(k%5)*14, oy=Math.floor(k/5)*12;
    drawPts=[{x:ox,y:oy},{x:ox+12,y:oy},{x:ox+12,y:oy+10},{x:ox,y:oy+10}]; closePoly(); } });
await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(6000);
/* ① ソフト描画（この検証環境）では、まとめ描きをしない */
ok(await p.evaluate(()=>nnIsSoftGL()===true),'①ソフト描画の環境だと分かっている');
const a=await p.evaluate(()=>({parts:T.group.children.length, calls:(T.renderer.render(T.scene,T.camera),T.renderer.info.render.calls)}));
ok(a.parts>3000,'①ソフト描画ではまとめ描きをしない（1本ずつのまま）',a);
/* ② 強制すると、まとめ描きが効く */
await p.evaluate(()=>{ window.nnForceInstance=true; dirty3d=true; build3D(); });
await p.waitForTimeout(400);
const c=await p.evaluate(()=>{ T.renderer.render(T.scene,T.camera);
  let inst=0, sum=0; T.group.traverse(o=>{ if(o.isInstancedMesh){inst++; sum+=o.count;} });
  return {parts:T.group.children.length, calls:T.renderer.info.render.calls,
          tri:T.renderer.info.render.triangles, まとめ:inst, 本数:sum}; });
ok(c.parts < a.parts*0.3,'②まとめ描きで部品が激減する',{前:a.parts,後:c.parts});
ok(c.calls < a.calls*0.4,'②描画の呼び出し回数も激減する',{前:a.calls,後:c.calls});
ok(c['まとめ']>0 && c['本数']>1000,'②継目はまとめられただけで、本数は減っていない',c);
ok(Math.abs(c.tri-140522)<20000,'②三角形の数は変わらない（見た目が同じ）',c.tri);
/* ③ CPU側の負担（呼び出しの手間）が減る */
const cpu=await p.evaluate(()=>{
  const el=T.renderer.domElement, w=el.width, h=el.height;
  const meas=()=>{ T.renderer.setSize(8,8,false); T.renderer.render(T.scene,T.camera);
    const t0=performance.now(); for(let i=0;i<15;i++) T.renderer.render(T.scene,T.camera);
    const ms=(performance.now()-t0)/15; T.renderer.setSize(w,h,false); return ms; };
  const on=meas();
  window.nnForceInstance=false; dirty3d=true; build3D();
  const off=meas();
  window.nnForceInstance=true; dirty3d=true; build3D();
  return {まとめあり:+on.toFixed(1), まとめなし:+off.toFixed(1)};
});
ok(cpu['まとめあり'] < cpu['まとめなし']*0.6,'★③呼び出しの手間が半分以下になる',cpu);
ok(errs.length===0,'JSエラーなし '+errs.slice(0,2).join(' / '));
await b.close(); console.log(ng?('★NG '+ng+'件'):'全部○'); process.exit(ng?1:0);
})();
