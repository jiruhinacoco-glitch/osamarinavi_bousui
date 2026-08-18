/* 数値入力の小窓：属性（数字キーパッド指定）・開閉・長さ変更の反映 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  p.on('dialog', d => { errs.push('★prompt/alertが出た: ' + d.message()); d.dismiss(); });
  await p.goto('http://localhost:8899/zumen_sekisan.html', { waitUntil: 'load' });
  await p.waitForTimeout(1200);
  const R = []; const ok = (n, c, ex) => R.push((c ? '○' : '★NG') + ' ' + n + (ex ? '  ' + ex : ''));

  // 1) 小窓の属性（作らせてから見る）
  await p.evaluate(() => nnNumAsk('テスト', '3.0', () => {}));
  const attrs = await p.evaluate(() => {
    const i = document.querySelector('#nnNumDlg input');
    const cs = getComputedStyle(i);
    return { mode: i.getAttribute('inputmode'), pat: i.getAttribute('pattern'),
             fs: cs.fontSize, open: document.getElementById('nnNumDlg').classList.contains('open'),
             focused: document.activeElement === i };
  });
  ok('数字キーパッド指定（inputmode=decimal）', attrs.mode === 'decimal', JSON.stringify(attrs));
  ok('文字16px＝タップ時に拡大しない', attrs.fs === '16px');
  ok('開いて入力欄にフォーカス', attrs.open && attrs.focused);
  // キャンセルで null が返る
  const canceled = await p.evaluate(() => new Promise(res => {
    nnNumAsk('テスト2', '1', v => res(v === null));
    document.querySelector('#nnNumDlg .ng').click();
  }));
  ok('キャンセル＝null', canceled);

  // 2) 四角をかく（PCはクリックで打点）→ 閉じる
  /* ★札のタップ入力は「かいている途中」の線に効く（閉じた後は選択ツール→右パネル）。
     3点だけ打って、閉じずに札をタップする */
  const pts = [[300, 300], [500, 300], [500, 420]];
  for (const [x, y] of pts) { await p.mouse.click(x, y); await p.waitForTimeout(200); }
  await p.waitForTimeout(500);

  // 3) 上辺の寸法札（中点の外側14px）をクリック → 小窓が開く
  let opened = false;
  for (const y of [286, 314, 282, 318]) {
    await p.mouse.click(400, y);
    await p.waitForTimeout(250);
    opened = await p.evaluate(() => document.getElementById('nnNumDlg').classList.contains('open'));
    if (opened) break;
    await p.evaluate(() => { const b = document.getElementById('tl_undo'); if (b) b.click(); });  // 外したら戻す
    await p.waitForTimeout(150);
  }
  ok('寸法の札タップで小窓が開く', opened);
  if (opened) {
    const title = await p.evaluate(() => document.querySelector('#nnNumDlg .t').textContent);
    ok('見出しが「この辺の長さ」', title.includes('この辺の長さ'), title);
    // 5 を入れて OK
    await p.evaluate(() => { const i = document.querySelector('#nnNumDlg input'); i.value = '5'; });
    await p.click('#nnNumDlg .okb');
    await p.waitForTimeout(400);
    const t = await p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
    ok('「長さを 5.0m にしました」', t.includes('5.0m'), t);
    const closed = await p.evaluate(() => !document.getElementById('nnNumDlg').classList.contains('open'));
    ok('小窓が閉じた', closed);
  }
  await p.screenshot({ path: 'znum.png' });
  console.log(R.join('\n'));
  console.log(errs.length ? '注意:\n' + errs.join('\n') : 'JSエラー・prompt なし');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
