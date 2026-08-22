/* ①磁石弱体化の回帰＋②3Dパラペット留め継ぎの座標検証 */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html', { waitUntil: 'load' }); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(s=>{window.__STUB=s;}, '('+require('./stub3.js').toString()+')()');
  await p.waitForTimeout(1200);
  const R = []; const ok = (n, c, ex) => R.push((c ? '○' : '★NG') + ' ' + n + (ex ? '  ' + ex : ''));

  /* ★2026-08-08c 打点は「直前の点から5度きざみ・0.1mきざみ」になったので、
     画面の適当な位置ではなく方眼の交差点そのものをクリックする
     （1点目が交差点へ寄るぶん、素の画面座標だと2点目以降の狙いがズレるため）。 */
  const gclick=async(gx,gy)=>{
    const c=await p.evaluate(({gx,gy})=>{
      const r=cv.getBoundingClientRect();
      const kx=r.width?(cv.width/devicePixelRatio)/r.width:1;
      const ky=r.height?(cv.height/devicePixelRatio)/r.height:1;
      return {x:r.left+(ox+gx*cellPx)/kx, y:r.top+(oy+gy*cellPx)/ky};
    },{gx,gy});
    await p.mouse.click(c.x,c.y); await p.waitForTimeout(150);
  };
  const toast = () => p.evaluate(() => (document.getElementById('toast') || {}).textContent || '');

  // ① 1棟目（4×3マス）
  for (const [gx,gy] of [[7,6],[11,6],[11,9],[7,9],[7,6]]) await gclick(gx,gy);
  await p.waitForTimeout(300);
  const t1 = await toast();
  ok('1棟目が閉じる（磁石で始点に吸着）', t1.includes('作成しました'), t1);
  // 描画ツールに戻す
  await p.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('描画')); if(b)b.click(); });
  await p.waitForTimeout(200);
  // 2棟目：1棟目の右上の角(436,300)から1マス(34px)右に離して、まっすぐな長方形
  for (const [gx,gy] of [[12,6],[15,6],[15,9],[12,9],[12,6]]) await gclick(gx,gy);
  await p.waitForTimeout(300);
  const t2 = await toast();
  // 3マス×3マス × 0.5m = 1.5m×1.5m = 2.25㎡ ←持っていかれるとこの値にならない
  ok('2棟目：隣でもまっすぐ（2.3㎡）', t2.includes('作成しました') && /2\.3\s*㎡|2\.3㎡/.test(t2), t2);

  // ② 3D：斜め辺のある3棟目
  await p.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('描画')); if(b)b.click(); });
  await p.waitForTimeout(200);
  for (const [gx,gy] of [[7,12],[13,12],[17,16],[7,16],[7,12]]) await gclick(gx,gy);
  await p.waitForTimeout(300);
  const res = await p.evaluate(() => {
    // ニセTHREE（座標を記録するだけ）
    const V2 = function(x, y) { this.x = x; this.y = y; };
    const noop = function(){};
    const obj = () => ({ position: { set(x,y,z){ this._p=[x,y,z]; }, y: 0 }, rotation: { y: 0 } });
        eval(window.__STUB);   /* ニセTHREE＝scratchpad/stub3.js */
    build3D();
    const g2 = window.__zGroups[window.__zGroups.length - 1];
    if (!g2) return { err: 'group無し' };
    // 壁＝押し出し(depth0.3)で上端0.3のもの（lv=0）
    /* ★2026-08-12k 天端の外側に面取り（20mm）を付けたので、壁は
       「本体（高さ hh-CH＝0.28）」と「天端寄りの帯（CH＝0.02）」の2枚に分かれた。
       留め継ぎの確認は本体のほうで行う（上端の高さも 0.28）。 */
    const walls = g2.children.filter(c => c.geometry && c.geometry.kind === 'ex' && Math.abs(c.geometry.depth - 0.28) < 1e-6 && Math.abs(c.position.y - 0.28) < 1e-6)
      .map(c => c.geometry.shape.pts.map(v => [v.x, v.y]));
    const caps = g2.children.filter(c => c.geometry && c.geometry.kind === 'ex' && Math.abs(c.geometry.depth - 0.035) < 1e-6)
      .map(c => c.geometry.shape.pts.map(v => [v.x, v.y]));
    /* ★2026-08-15 出隅（縦の角）の面取りは廃止された（本人の指示）。
       角は留め継ぎ（joint）で、隣り合う壁どうしが直接突き合う形に戻ったので、
       確かめ方も元に戻す：**隣り合う壁が「外側＋内側」の2点で一致していれば、すき間0**。
       角の三角柱はもう作らないので 0個が正しい。 */
    const near = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1]) < 1e-6;
    const quads = walls.filter(w => w.length === 4);
    const tris  = walls.filter(w => w.length === 3);
    let cornersOK = 0, cornersNG = 0;
    for (let i = 0; i < quads.length; i++) for (let j = i+1; j < quads.length; j++) {
      const n2 = quads[i].filter(pa => quads[j].some(pb => near(pa, pb))).length;
      if (n2 >= 1) { if (n2 === 2) cornersOK++; else cornersNG++; }
    }
    return { nWalls: quads.length, nTris: tris.length, nCaps: caps.length, cornersOK, cornersNG };
  });
  ok('3D：辺の壁は12枚（3棟×4辺）', res.nWalls === 12, JSON.stringify(res));
  ok('3D：出隅の面取り（三角）は無い（2026-08-15 廃止）', res.nTris === 0, res.nTris+'個');
  ok('3D：隣り合う壁が2点で一致（角のすき間0）', res.cornersOK === 12 && res.cornersNG === 0,
     `一致${res.cornersOK}／不一致${res.cornersNG}`);
  ok('3D：笠木は出さない（本人の指示で廃止）', res.nCaps === 0, '笠木'+res.nCaps+'枚');

  await p.screenshot({ path: 'zfix2.png' });
  console.log(R.join('\n'));
  console.log(errs.length ? 'JSエラー:\n' + errs.join('\n') : 'JSエラーなし');
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
