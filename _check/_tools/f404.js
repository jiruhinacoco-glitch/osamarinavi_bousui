const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,deviceScaleFactor:2})).newPage();
  p.on('console', m => { if (m.type()==='error') console.log('CONSOLE', m.text(), JSON.stringify(m.location())); });
  p.on('response', r => { if (r.status()>=400) console.log('HTTP'+r.status(), r.url()); });
  await p.goto('http://localhost:8899/index.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  await browser.close();
})();
