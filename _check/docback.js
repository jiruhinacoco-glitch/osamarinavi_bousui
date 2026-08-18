/* 書類3系統（図面・工程表・報告書）の別タブに「← 戻る」が付き、押すと閉じるか */
const { chromium } = require('/opt/pw-browsers/chromium-1194/chrome-linux/chrome' && '/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const R = []; const ok = (n, c, ex) => R.push((c ? '○' : '★NG') + ' ' + n + (ex ? '  ' + ex : ''));

  async function tryDoc(name, pageUrl, prep, trigger, backLabel) {
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(pageUrl, { waitUntil: 'load' });
    await p.waitForTimeout(1200);
    if (prep) await prep(p);
    const [doc] = await Promise.all([ctx.waitForEvent('page'), p.evaluate(trigger)]);
    await doc.waitForLoadState('domcontentloaded').catch(() => {});
    await doc.waitForTimeout(600);
    const derrs = []; doc.on('pageerror', e => derrs.push(e.message));
    const btn = await doc.evaluate(lb => {
      const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes(lb));
      return b ? b.textContent.trim() : null;
    }, backLabel).catch(e => null);
    ok(name + '：戻るボタンあり', btn === backLabel, String(btn));
    if (btn) {
      const closed = await Promise.all([
        doc.waitForEvent('close', { timeout: 4000 }).then(() => true).catch(() => false),
        doc.evaluate(lb => { [...document.querySelectorAll('button')].find(x => x.textContent.includes(lb)).click(); }, backLabel).catch(() => {}),
      ]).then(r => r[0]);
      ok(name + '：押すと閉じる', closed);
    }
    if (errs.length || derrs.length) ok(name + '：JSエラー', false, (errs.concat(derrs)).join('|'));
    await p.close();
  }

  // 1) 図面・積算（サンプル形状 → 平面図）
  await tryDoc('平面図', 'http://localhost:8899/zumen_sekisan.html',
    async p => { await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes('サンプル形状')); if (b) b.click(); }); await p.waitForTimeout(600); },
    "nnPlanPDF()", '← 図面に戻る');

  // 2) 現場記録帳（工程表PDF・施工中 J051=id51）
  await tryDoc('工程表', 'http://localhost:8899/kirokucho_demo.html',
    null, "nnKoteiPDF(51)", '← 記録帳に戻る');

  // 3) 現場記録帳（物件報告書）
  await tryDoc('報告書', 'http://localhost:8899/kirokucho_demo.html',
    null, "exportPDF(1)", '← 記録帳に戻る');

  console.log(R.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
