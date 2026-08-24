const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  for (const vp of [{w:852,h:393,n:'yoko'},{w:393,h:852,n:'tate'}]) {
    const p = await (await browser.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
    await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('サンプル形状')); if(b)b.click(); });
    await p.waitForTimeout(700);
    await p.evaluate(()=>setTab('sec')); await p.waitForTimeout(800);
    await p.screenshot({path:'sec2_'+vp.n+'.png'});
    const m = await p.evaluate(()=>({bar:document.getElementById('secBar').offsetHeight,
      note:document.getElementById('secNote').textContent.slice(0,30)}));
    console.log(vp.n, JSON.stringify(m));
    await p.close();
  }
  await browser.close();
})();
