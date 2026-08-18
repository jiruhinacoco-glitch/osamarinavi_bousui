const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const cdp=await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});   // 実機に近い負荷
  const t0=Date.now();
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
  const tLoad=Date.now()-t0;
  await p.waitForTimeout(1500);
  const three0=await p.evaluate(()=>typeof THREE);
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(500);
  const t1=Date.now();
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof THREE!=='undefined' && typeof T!=='undefined' && T && T.group && T.group.children.length>0, {timeout:25000});
  const tD3=Date.now()-t1;
  await p.waitForTimeout(1200);
  const d=await p.evaluate(()=>({pr:T.renderer.getPixelRatio(), dpr:devicePixelRatio,
    meshes:T.group.children.length, shadow:T.renderer.shadowMap.enabled}));
  // 描画の速さ：60コマぶんの時間
  const fps=await p.evaluate(()=>new Promise(res=>{let n=0,s=performance.now();
    (function f(){ n++; if(n<60) requestAnimationFrame(f); else res(Math.round(60000/(performance.now()-s))); })();}));
  console.log('ページを開くまで', tLoad+'ms（この時点でTHREEは', three0, '）');
  console.log('3Dタブを押してから出るまで', tD3+'ms（CPU6倍負荷）');
  console.log('描画', JSON.stringify(d), ' 毎秒', fps, 'コマ');
  console.log('JSエラー', errs.length?errs:'なし');
  const w=await p.$('#three-wrap'); await w.screenshot({path:'d3_mobile.png'});
  await b.close();
})();
