/* たて画面：チップ帯の高さ（2段になっていないか）と一覧の見た目 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(() => {
    Object.defineProperty(screen,'width',{get:()=>393});
    Object.defineProperty(screen,'height',{get:()=>852});
    localStorage.removeItem('nn_kirokucho_def_v1');
  });
  await p.goto('http://localhost:8899/kirokucho_demo.html', { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => showView('list'));
  await p.waitForTimeout(800);
  const m = await p.evaluate(() => {
    const bar=document.getElementById('toolbar')||document.querySelector('.stbar');
    const chips=document.getElementById('chips');
    const rb=bar.getBoundingClientRect();
    const chipEls=[...chips.querySelectorAll('.stchip')];
    const tops=new Set(chipEls.map(c=>Math.round(c.getBoundingClientRect().top)));
    // 調査済の物件までスクロールしてチップ付きカードを出す
    return { barH:+(rb.height).toFixed(1), rows:tops.size, chips:chipEls.map(c=>c.textContent.trim()) };
  });
  console.log('チップ帯: 高さ', m.barH, 'px / 段数', m.rows, '/', m.chips.join(','));
  // 調査済カードを表示してスクショ
  await p.evaluate(() => {
    const c=[...document.querySelectorAll('#list .pcard')].find(x=>x.textContent.includes('南2条オフィスビル'));
    if(c)c.scrollIntoView({block:'center'});
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'kdef_tate.png' });
  console.log(errs.length?'JSエラー: '+errs.join('|'):'JSエラーなし');
  await browser.close();
})();
