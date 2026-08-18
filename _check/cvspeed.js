/* content-visibility あり／なし で「現場一覧を開く」時間を比べる（CPU4倍の負荷） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const off of [false,true]){
    const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
    const cdp=await p.context().newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2500);
    if(off) await p.addStyleTag({content:'#list .pcard{content-visibility:visible !important;}'});
    const t=await p.evaluate(()=>{const t0=performance.now(); showView('list');
      document.body.offsetHeight; return performance.now()-t0;});
    await p.waitForTimeout(1200);
    const t2=await p.evaluate(()=>{const t0=performance.now(); render();
      document.getElementById('list').offsetHeight; return performance.now()-t0;});
    console.log((off?'content-visibility なし':'content-visibility あり')+
      '： 一覧を開く '+t.toFixed(0)+'ms ／ 作り直し '+t2.toFixed(0)+'ms');
    await p.close();
  }
  await b.close();
})();
