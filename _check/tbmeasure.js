const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  for (const vp of [{w:393,h:852,n:'たて'},{w:852,h:393,n:'よこ'}]) {
    const p = await (await browser.newContext({ viewport:{width:vp.w,height:vp.h}, deviceScaleFactor:2, isMobile:true, hasTouch:true })).newPage();
    await p.addInitScript(() => { Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); });
    await p.goto('http://localhost:8899/kirokucho_demo.html', { waitUntil:'load' });
    await p.waitForTimeout(1400);
    await p.evaluate(() => showView('list'));
    await p.waitForTimeout(700);
    const m = await p.evaluate(() => {
      const r = el => { const b = el.getBoundingClientRect(); return {x:+b.x.toFixed(1), w:+b.width.toFixed(1), right:+b.right.toFixed(1)}; };
      const tb=document.getElementById('toolbar'), s=tb.querySelector('.search'), c=document.getElementById('chips'), lc=document.getElementById('nnLC');
      return { tb:r(tb), search:r(s), input:r(s.querySelector('input')), chips:r(c), chipsScroll:c.scrollWidth, lc:lc?r(lc):null,
               chipList:[...c.querySelectorAll('.stchip')].map(x=>({t:x.textContent.trim(), ...r(x)})) };
    });
    console.log('=== ' + vp.n + ' (' + vp.w + 'x' + vp.h + ') ===');
    console.log('toolbar', JSON.stringify(m.tb), ' search', JSON.stringify(m.search), ' input', JSON.stringify(m.input));
    console.log('chips', JSON.stringify(m.chips), 'scrollW', m.chipsScroll, ' LC', JSON.stringify(m.lc));
    console.log('chip1', JSON.stringify(m.chipList[0]), 'chipLast', JSON.stringify(m.chipList[m.chipList.length-1]));
    await p.close();
  }
  await browser.close();
})();
