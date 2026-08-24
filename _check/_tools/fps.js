const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  for(const [file,name] of [['__before.html','前（r128・Lambert）'],['zumen_sekisan.html','後（r159・PBR＋影）']]){
    const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    await p.goto('http://localhost:8899/'+file,{waitUntil:'load'}); await p.waitForTimeout(1200);
    await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
    await p.evaluate(()=>setTab('d3'));
    await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
    await p.waitForTimeout(1200);
    const r=await p.evaluate(()=>new Promise(res=>{let n=0,s=performance.now();
      (function f(){ n++; if(n<90) requestAnimationFrame(f); else res({fps:Math.round(90000/(performance.now()-s)), pr:T.renderer.getPixelRatio()}); })();}));
    console.log(name.padEnd(24), '毎秒'+String(r.fps).padStart(3)+'コマ  画素密度'+r.pr);
    await p.close();
  }
  await b.close();
})();
