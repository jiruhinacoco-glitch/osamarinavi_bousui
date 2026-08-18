/* データの保存・復元の動作確認：
   1) 設定ボタンでパネルが開く・件数の一覧が正しい
   2) 書き出し＝ダウンロードが起き、中身のJSONが正しい
   3) 読み込み＝ファイル選択→confirm→localStorageに復元される
   4) 納まりナビ以外のファイルは断る
   5) ✕で閉じる  */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    acceptDownloads: true,
  });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  p.on('response', r => { if (r.status() === 404) errs.push('404: ' + r.url()); });

  // 端末の保存データを仕込んでから開く
  await p.addInitScript(() => {
    Object.defineProperty(screen, 'width', { get: () => 393 });
    Object.defineProperty(screen, 'height', { get: () => 852 });
    localStorage.setItem('nn_materials_v1', JSON.stringify({ v: 1, items: [{ n: 'a' }, { n: 'b' }, { n: 'c' }] }));
    localStorage.setItem('nn_specs_v1', JSON.stringify({ v: 1, items: [{ n: 's1' }] }));
    localStorage.setItem('nn_zumen_plan_v1', JSON.stringify({ title: 'テスト工事', author: '佐野' }));
    localStorage.setItem('nn_yougo_stars', JSON.stringify(['天端', '入隅']));
    localStorage.setItem('osamari_gmaps_key', 'DUMMYKEY');
  });
  await p.goto('http://localhost:8899/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(600);

  const R = [];
  const ok = (name, cond, extra) => R.push((cond ? '○' : '★NG') + ' ' + name + (extra ? '  ' + extra : ''));

  // 1) 設定ボタンで開く
  await p.evaluate(() => navGo('settei', '設定'));
  await p.waitForTimeout(200);
  ok('パネルが開く', await p.evaluate(() => {
    const w = document.getElementById('nnDataBk');
    return w && !w.hidden && w.querySelector('.bk-card').getBoundingClientRect().height > 100;
  }));
  const sum = await p.evaluate(() => document.getElementById('nnBkSum').innerText);
  ok('一覧に5種類', sum.includes('5種類'), sum.split('\n')[0]);
  ok('材料3件', /材料[\s\S]*?3件/.test(sum));
  ok('仕様1件', /仕様[\s\S]*?1件/.test(sum));
  ok('お気に入り2件', /お気に入り[\s\S]*?2件/.test(sum));
  ok('APIキーは「保存あり」', /かぎ（APIキー）\s*保存あり/.test(sum.replace(/\n/g, ' ')));

  // 2) 書き出し（実ダウンロード）
  const [dl] = await Promise.all([
    p.waitForEvent('download', { timeout: 5000 }),
    p.click('#nnBkExp'),
  ]);
  const fn = dl.suggestedFilename();
  const path = '/tmp/claude-0/-home-user-osamarinavi-bousui/14021813-84a1-5c50-96c6-9a3eca49d2e3/scratchpad/' + fn;
  await dl.saveAs(path);
  const obj = JSON.parse(fs.readFileSync(path, 'utf8'));
  ok('ファイル名に日付', /^osamarinavi_data_\d{4}-\d{2}-\d{2}\.json$/.test(fn), fn);
  ok('中身: kind/ver/date', obj.kind === 'nn_backup' && obj.ver === 1 && !!obj.date);
  ok('中身: 5キー', Object.keys(obj.data).length === 5, Object.keys(obj.data).join(','));
  ok('中身: 材料が元どおり', JSON.parse(obj.data.nn_materials_v1).items.length === 3);
  const msg1 = await p.evaluate(() => document.getElementById('nnBkMsg').innerText);
  ok('案内文（書き出し）', msg1.includes('書き出しました') && msg1.includes('5種類'), msg1.split('\n')[0]);

  // 3) 読み込み：保存を全部消してから、書き出したファイルで復元
  await p.evaluate(() => localStorage.clear());
  await p.evaluate(() => nnDataOpen());
  ok('消去後は0種類', (await p.evaluate(() => document.getElementById('nnBkSum').innerText)).includes('0種類'));
  let confirmText = '';
  p.once('dialog', d => { confirmText = d.message(); d.accept(); });
  await p.setInputFiles('#nnBkFile', path);
  await p.waitForTimeout(400);
  ok('confirmの文', confirmText.includes('5種類') && confirmText.includes('上書き'), confirmText.slice(0, 40));
  const back = await p.evaluate(() => ({
    mat: localStorage.getItem('nn_materials_v1'),
    key: localStorage.getItem('osamari_gmaps_key'),
    sum: document.getElementById('nnBkSum').innerText,
    msg: document.getElementById('nnBkMsg').innerText,
  }));
  ok('復元: 材料3件', back.mat && JSON.parse(back.mat).items.length === 3);
  ok('復元: APIキー', back.key === 'DUMMYKEY');
  ok('復元後の一覧が5種類', back.sum.includes('5種類'));
  ok('案内文（読み込み）', back.msg.includes('読み込みました（5種類）'), back.msg);

  // 4) 関係ないファイルは断る
  const badPath = path.replace('.json', '_bad.json');
  fs.writeFileSync(badPath, JSON.stringify({ hello: 'world' }));
  await p.setInputFiles('#nnBkFile', badPath);
  await p.waitForTimeout(300);
  const msgBad = await p.evaluate(() => document.getElementById('nnBkMsg').innerText);
  ok('別ファイルは断る', msgBad.includes('納まりナビのデータではない'), msgBad.slice(0, 40));

  // 5) ✕で閉じる／もう一度開ける
  await p.click('#nnDataBk .bk-x');
  ok('✕で閉じる', await p.evaluate(() => document.getElementById('nnDataBk').hidden));
  await p.evaluate(() => navGo('settei', '設定'));
  ok('もう一度開ける', await p.evaluate(() => !document.getElementById('nnDataBk').hidden));

  // スクリーンショット（目視用）
  await p.screenshot({ path: '/tmp/claude-0/-home-user-osamarinavi-bousui/14021813-84a1-5c50-96c6-9a3eca49d2e3/scratchpad/databk_panel.png' });

  console.log(R.join('\n'));
  console.log(errs.length ? 'JSエラー:\n' + errs.join('\n') : 'JSエラーなし');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
