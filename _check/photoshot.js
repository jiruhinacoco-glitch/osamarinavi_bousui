const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  for (const vp of [{w:393,h:852,n:'tate'},{w:852,h:393,n:'yoko'}]) {
    const p = await (await browser.newContext({viewport:{width:vp.w,height:vp.h},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
    await p.evaluate(()=>nnPhotoOpen()); await p.waitForTimeout(300);
    await p.evaluate(()=>nnPhotoTestLoad(1200,800)); await p.waitForTimeout(500);
    await p.evaluate(()=>{ nnPhotoTestTap(400,250); nnPhotoTestTap(800,250); nnPhotoTestTap(1000,650); nnPhotoTestTap(200,650); nnPhotoTestSize(12,9); });
    await p.waitForTimeout(400);
    const m = await p.evaluate(()=>{
      const t=document.getElementById('nnPhTop');
      const bs=[...t.querySelectorAll('button')];
      return { rows:new Set(bs.map(b=>Math.round(b.getBoundingClientRect().top))).size,
               barH:+t.getBoundingClientRect().height.toFixed(0),
               right:Math.max(...bs.map(b=>+b.getBoundingClientRect().right.toFixed(0))), W:innerWidth };
    });
    console.log(vp.n, 'バー高'+m.barH+'px ボタン'+m.rows+'段 右端'+m.right+'/'+m.W, m.right<=m.W?'○':'★NG');
    await p.screenshot({path:'photo_'+vp.n+'.png'});
    await p.close();
  }
  await browser.close();
})();
