const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  await p.goto('http://localhost:8899/zumen_sekisan.html', { waitUntil: 'load' }); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const c = document.querySelector('canvas'); const b = c.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, id: c.id }; });
  console.log('canvas:', JSON.stringify(r));
  for (const [x, y] of [[300, 300], [500, 300], [500, 420], [300, 420], [300, 300]]) {
    await p.mouse.click(x, y); await p.waitForTimeout(200);
  }
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'zdbg.png' });
  await browser.close();
})();
