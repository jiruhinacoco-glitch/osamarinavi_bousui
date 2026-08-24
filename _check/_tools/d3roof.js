const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1100,height:760},deviceScaleFactor:3});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
  await p.waitForTimeout(1800);
  // ①部位だけにして屋根をよく見る
  await p.evaluate(()=>{ state.polys=state.polys.slice(0,1); dirty3d=true; d3WantFit=true; build3D(); });
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{ T.theta=-0.8; T.phi=1.10; });
  await p.waitForTimeout(600);
  const w=await p.$('#three-wrap'); await w.screenshot({path:'d3_roof.png'});
  console.log('ok');
  await b.close();
})();
