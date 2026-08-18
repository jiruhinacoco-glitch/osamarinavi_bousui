/* 不具合・現場条件タグの動作確認：
   1) 一覧カードにサンプルのチップが出る
   2) 「不具合別」で絞り込める（件数・絞り込み中タグ・リセット）
   3) 詳細のタグ行＋「✎ タグを編集」→ 付け外し → 保存される
   4) 再読み込みしても残る  */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const SP = '/tmp/claude-0/-home-user-osamarinavi-bousui/14021813-84a1-5c50-96c6-9a3eca49d2e3/scratchpad/';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({ viewport: { width: 852, height: 393 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await p.addInitScript(() => {
    Object.defineProperty(screen, 'width', { get: () => 393 });
    Object.defineProperty(screen, 'height', { get: () => 852 });
  });
  const R = [];
  const ok = (n, c, ex) => R.push((c ? '○' : '★NG') + ' ' + n + (ex ? '  ' + ex : ''));

  await p.goto('http://localhost:8899/kirokucho_demo.html', { waitUntil: 'load' });
  await p.evaluate(() => localStorage.removeItem('nn_kirokucho_def_v1'));   // 前回のテストの保存を消してから
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(1500);

  // 現場一覧へ
  await p.evaluate(() => showView('list'));
  await p.waitForTimeout(600);

  // 1) サンプルのチップ
  const card = await p.evaluate(() => {
    const c = [...document.querySelectorAll('#list .pcard')].find(x => x.textContent.includes('南2条オフィスビル'));
    if (!c) return null;
    return { chips: [...c.querySelectorAll('.defchip')].map(x => x.textContent.trim()) };
  });
  ok('J064カードにチップ3個', card && card.chips.length === 3, card && card.chips.join('/'));
  const total = await p.evaluate(() => document.querySelectorAll('#list .pcard .defchip').length);
  ok('一覧にチップが多数（サンプル反映）', total >= 20, total + '個');

  // 2) 「不具合別」絞り込み
  const chip = await p.evaluate(() => {
    const b = document.querySelector('#chips .dfil[data-k="defect"] button');
    return b ? b.textContent : null;
  });
  ok('「不具合」チップがある', chip && chip.includes('不具合'), chip);
  await p.dispatchEvent('#chips .dfil[data-k="defect"] button', 'pointerdown');
  await p.waitForTimeout(400);
  const menu = await p.evaluate(() => {
    const m = document.getElementById('nnPortal');   // ポータル自身が .dfmenu になる作り
    if (m && !m.className.includes('dfmenu')) return null;
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return { rows: m.querySelectorAll('label.dfrow').length, gh: m.querySelectorAll('.dfgh').length,
             inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth };
  });
  ok('メニューが画面内に開く', menu && menu.inView, JSON.stringify(menu));
  ok('メニューは4グループ・25行', menu && menu.gh === 4 && menu.rows === 25, menu && (menu.gh + 'グループ' + menu.rows + '行'));
  // 「膨れ」にチェック（portal内）
  await p.evaluate(() => {
    const row = [...document.querySelectorAll('#nnPortal label.dfrow')].find(l => l.querySelector('.vn').textContent === '膨れ');
    row.querySelector('input').click();
  });
  await p.waitForTimeout(500);
  const st1 = await p.evaluate(() => ({
    lc: document.getElementById('nnLC').innerText.replace(/\s/g, ''),
    tag: (document.querySelector('#list .listhead') || {}).innerText || '',
    n: document.querySelectorAll('#list .pcard').length,
  }));
  ok('膨れで絞り込み＝5件', st1.lc.includes('表示5件') && st1.n === 5, st1.lc + ' cards=' + st1.n);
  ok('絞り込み中タグに「不具合膨れ」', st1.tag.includes('不具合') && st1.tag.includes('膨れ'), st1.tag.replace(/\n/g, ' ').slice(0, 60));
  await p.evaluate(() => lfResetAll());
  await p.waitForTimeout(400);
  const st2 = await p.evaluate(() => document.querySelectorAll('#list .pcard').length +
    document.querySelectorAll('#list .listhead').length * 0);
  // 100件は分割描画なので少し待つ
  await p.waitForTimeout(600);
  const n2 = await p.evaluate(() => document.querySelectorAll('#list .pcard').length);
  /* ★2026-08-12v に物件を総入れ替え（77→100件） */
  ok('リセットで全100件に戻る', n2 === 100, n2 + '件');

  // 3) 詳細＋編集
  await p.evaluate(() => { selectedId = props.find(x => x.code === 'J064').id; openDetailFull(); });
  await p.waitForTimeout(500);
  const det = await p.evaluate(() => {
    const d = document.querySelector('#detail .defrow');
    return d ? { chips: d.querySelectorAll('.defchip').length, btn: !!d.querySelector('.defedit') } : null;
  });
  ok('詳細にタグ行＋編集ボタン', det && det.chips === 3 && det.btn, JSON.stringify(det));
  await p.click('#detail .defedit');
  await p.waitForTimeout(300);
  const modal = await p.evaluate(() => {
    const m = document.getElementById('nnDefModal');
    if (!m || !m.classList.contains('open')) return null;
    return { all: m.querySelectorAll('.defchip').length, on: m.querySelectorAll('.defchip.on').length };
  });
  ok('編集画面：25個中3個が選択中', modal && modal.all === 25 && modal.on === 3, JSON.stringify(modal));
  await p.screenshot({ path: SP + 'kdef_modal.png' });
  // 「漏水」を付ける
  await p.evaluate(() => {
    [...document.querySelectorAll('#nnDefModal .defchip')].find(c => c.textContent.trim() === '漏水').click();
  });
  await p.waitForTimeout(200);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('nn_kirokucho_def_v1') || '{}'));
  ok('保存された（J064に4個）', saved.J064 && saved.J064.length === 4 && saved.J064.includes('rosui'), JSON.stringify(saved.J064));
  await p.evaluate(() => nnDefClose());
  await p.waitForTimeout(500);
  const det2 = await p.evaluate(() => document.querySelectorAll('#detail .defrow .defchip').length);
  ok('閉じると詳細に4個', det2 === 4, det2 + '個');

  // 4) 再読み込みで残る
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(1500);
  await p.evaluate(() => showView('list'));
  await p.waitForTimeout(800);
  const after = await p.evaluate(() => {
    const c = [...document.querySelectorAll('#list .pcard')].find(x => x.textContent.includes('南2条オフィスビル'));
    return c ? c.querySelectorAll('.defchip').length : -1;
  });
  ok('再読み込み後もJ064は4個', after === 4, after + '個');
  await p.screenshot({ path: SP + 'kdef_list.png' });

  console.log(R.join('\n'));
  console.log(errs.length ? 'JSエラー:\n' + errs.join('\n') : 'JSエラーなし');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
