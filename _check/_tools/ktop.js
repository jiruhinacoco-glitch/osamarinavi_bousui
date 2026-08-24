const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({ viewport:{width:852,height:393}, deviceScaleFactor:2, isMobile:true, hasTouch:true })).newPage();
  await p.addInitScript(() => { Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); localStorage.removeItem('nn_kirokucho_def_v1'); });
  await p.goto('http://localhost:8899/kirokucho_demo.html', { waitUntil:'load' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => showView('list'));
  await p.waitForTimeout(800);
  const n = await p.evaluate(() => {
    const cards=[...document.querySelectorAll('#list .pcard')].slice(0,8);
    return cards.filter(c=>c.querySelector('.defchip')).length;
  });
  console.log('先頭8件のうちタグ付き:', n, '件');
  await p.screenshot({ path: 'ktop.png' });
  await browser.close();
})();
