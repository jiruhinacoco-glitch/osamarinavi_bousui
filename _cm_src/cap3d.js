const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  // 3D ぐるり
  const p=await b.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
  await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(3000);
  await p.addStyleTag({content:'body *{visibility:hidden !important} #three-wrap > canvas{visibility:visible !important}'});
  const r0=await p.evaluate(()=>T.r);
  const w=await p.$('#three-wrap > canvas');
  const N=180;
  for(let i=0;i<N;i++){
    const k=i/(N-1);
    await p.evaluate(([k,r0])=>{ T.theta=-1.35+1.05*k; T.phi=0.98+0.10*k; T.r=r0*(0.80-0.16*k); },[k,r0]);
    await p.waitForTimeout(220);
    await w.screenshot({path:'d3/f'+String(i).padStart(3,'0')+'.jpg',type:'jpeg',quality:88});
  }
  console.log('done');
  await b.close();
})();
