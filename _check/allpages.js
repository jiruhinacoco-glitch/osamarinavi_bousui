const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const PAGES=['index.html','kirokucho_demo.html','zumen_sekisan.html','genba_map_v36.html','hacchu.html','kokkosho.html','camera.html','library.html','shiyo_toroku.html','yougo.html','zairyo_toroku.html'];
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  for(const f of PAGES){
    const p = await ctx.newPage();
    const errs=[];
    p.on('pageerror', e=>errs.push(e.message));
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    try{
      await p.goto('http://localhost:8899/'+f,{waitUntil:'load',timeout:20000});
      await p.waitForTimeout(900);
      const ver=await p.evaluate(()=>typeof NN_VER!=='undefined'?NN_VER:(window.nnVerNow||'?'));
      console.log((errs.length?'★NG':'○'), f, 'NN_VER='+ver, errs.join(' | '));
    }catch(e){ console.log('★NG', f, 'openfail', e.message.split('\n')[0]); }
    await p.close();
  }
  await browser.close();
})();
