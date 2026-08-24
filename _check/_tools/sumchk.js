const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({viewport:{width:393,height:852}})).newPage();
  p.on('requestfailed', r => console.log('FAIL', r.url()));
  p.on('response', r => { if(r.status()===404) console.log('404', r.url()); });
  await p.addInitScript(() => { localStorage.setItem('nn_materials_v1', JSON.stringify({v:1,items:[1,2,3]})); });
  await p.goto('http://localhost:8899/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(500);
  await p.evaluate(() => nnDataOpen());
  console.log(JSON.stringify(await p.evaluate(() => document.getElementById('nnBkSum').innerText)));
  await browser.close();
})();
