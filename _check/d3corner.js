/* 出隅を寄って撮る（本人の指摘①②の再現・確認用）
   使い方: node d3corner.js out.png [phi] [theta] [r] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const OUT=process.argv[2]||'d3corner.png';
const PHI=+(process.argv[3]||1.30), TH=+(process.argv[4]||0.9), RR=+(process.argv[5]||4.5);
(async()=>{
  const b=await chromium.launch({executablePath:EXE, args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx=await b.newContext({viewport:{width:1400,height:900}});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{
    /* GL±0 の長方形（10m×7m・立上り300・天端250）1枚だけ */
    const s=state.scaleM;
    const mk=(pts,lv)=>({lv, pts, edges:pts.map(()=>({h:300,w:250,k:'para'})), name:'検証用'});
    state.polys=[mk([{x:0,y:0},{x:20,y:0},{x:20,y:14},{x:0,y:14}],0)];
    state.active=0; sel=null; saveState(); renderPolyList(); draw(); setTab('d3');
  });
  await p.waitForTimeout(4000);
  const info=await p.evaluate(({PHI,TH,RR})=>{
    const s=state.scaleM, cx=20*s, cz=0*s;
    T.tx=cx; T.tz=cz; T.r=RR; T.phi=PHI; T.theta=TH; T.rev=(T.rev|0)+1;
    const names={}; T.group.traverse(o=>{ if(o.isMesh){ const k=o.name||'(noname)'; names[k]=(names[k]||0)+1; } });
    return {s, cx, cz, meshes:T.group.children.length, names};
  },{PHI,TH,RR});
  console.log(JSON.stringify(info));
  await p.waitForTimeout(1500);
  await p.locator('#three-wrap').screenshot({path:OUT});
  console.log('errs', errs.join(' / '));
  await b.close();
})();
