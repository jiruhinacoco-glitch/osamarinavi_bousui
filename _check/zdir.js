/* ①部位ごとの流し方向 ②数値欄が数字キーボードになる */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(s=>{window.__STUB=s;}, '('+require('./stub3.js').toString()+')()');
  await p.waitForTimeout(1200);
  const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex?'  '+ex:''));

  // ② 数値欄：type=number に inputmode=decimal（GL+ 含む）
  // まずサンプル形状を読み込んで部位を2つ作る
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('サンプル')); if(b)b.click(); });
  await p.waitForTimeout(700);
  const inp = await p.evaluate(()=>{
    const all=[...document.querySelectorAll('input[type="number"]')];
    const gl=[...document.querySelectorAll('.lvin')];
    return { n:all.length, withMode:all.filter(x=>x.getAttribute('inputmode')==='decimal').length,
             glN:gl.length, glMode:gl.every(x=>x.getAttribute('inputmode')==='decimal') };
  });
  ok('数値欄はすべて数字キーボード指定', inp.n>0 && inp.n===inp.withMode, `${inp.withMode}/${inp.n}`);
  ok('GL+の欄も数字キーボード', inp.glN>0 && inp.glMode, 'GL欄'+inp.glN+'個');

  // ① 部位ごとの流し方向
  const st = await p.evaluate(()=>({parts:state.polys.length, names:state.polys.map(x=>x.name)}));
  ok('サンプルで部位が2つ以上', st.parts>=2, st.parts+'面 '+st.names.join('/'));
  // 割付タブへ
  await p.evaluate(()=>setTab('wf'));
  await p.waitForTimeout(600);
  const ui = await p.evaluate(()=>{
    const d=document.getElementById('dirRows');
    return { rows:d?d.querySelectorAll('.dirrow').length:0,
             shortBtn: !!document.getElementById('dir_s'),
             segBtns: d?d.querySelectorAll('.dirrow')[0].querySelectorAll('button').length:0,
             now: d?[...d.querySelectorAll('.now')].map(x=>x.textContent):[] };
  });
  ok('「短手に流す」ボタンがある', ui.shortBtn);
  ok('部位ごとの行が出る', ui.rows===st.parts, ui.rows+'行');
  ok('各行に4択（全体/横/縦/短手）', ui.segBtns===4, ui.segBtns+'個');
  ok('いまの向きが全部「横流し」', ui.now.every(t=>t==='横流し'), ui.now.join(','));

  // 2つ目の部位だけ「縦」にする → 表示と実データが変わる
  await p.evaluate(()=>setPolyDir(1,'v'));
  await p.waitForTimeout(400);
  const after = await p.evaluate(()=>({
    now:[...document.querySelectorAll('#dirRows .now')].map(x=>x.textContent),
    dirs:state.polys.map(x=>x.dir||''), calc:state.polys.map(x=>dirOf(x))}));
  ok('2つ目だけ縦流しになる', after.now[0]==='横流し'&&after.now[1]==='縦流し', after.now.join(','));
  ok('保存される（poly.dir）', after.dirs[0]===''&&after.dirs[1]==='v', JSON.stringify(after.dirs));

  // 「短手」：外接矩形から自動で向きが決まる
  await p.evaluate(()=>setPolyDir(1,'short'));
  await p.waitForTimeout(300);
  const sh = await p.evaluate(()=>{
    const p1=state.polys[1];
    let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
    p1.pts.forEach(q=>{mnx=Math.min(mnx,q.x);mxx=Math.max(mxx,q.x);mny=Math.min(mny,q.y);mxy=Math.max(mxy,q.y);});
    return { W:+(mxx-mnx).toFixed(2), H:+(mxy-mny).toFixed(2), dir:dirOf(p1) };
  });
  ok('短手＝横長なら縦流し／縦長なら横流し', sh.dir===((sh.W>=sh.H)?'v':'h'), `幅${sh.W} 高${sh.H} → ${sh.dir}`);

  // 割付図に実際に反映されているか（3Dの継目の本数で確認：ニセTHREEで build3D）
  const seams = await p.evaluate(()=>{
    const noop=function(){};
    const obj=()=>({position:{set(x,y,z){this._p=[x,y,z];},y:0},rotation:{y:0}});

    eval(window.__STUB);   /* ニセTHREE＝scratchpad/stub3.js */
    show3dWari=true; dirty3d=true; build3D();
    const g=window.__zMain();
    // 継目線＝BoxGeometry で厚み0.006 のもの。x方向に長い＝横流し、z方向に長い＝縦流し
    const seam=g.children.filter(c=>c.geometry&&c.geometry.kind==='cyl');
    const xlong=seam.filter(c=>c.geometry.alongX).length;
    const zlong=seam.filter(c=>!c.geometry.alongX).length;
    return {seam:seam.length, xlong, zlong};
  });
  ok('3Dの継目に両方向が現れる（部位で向きが違う）', seams.xlong>0 && seams.zlong>0, JSON.stringify(seams));

  // 全体を「短手」にすると部位ごとに自動で決まる
  await p.evaluate(()=>{ setPolyDir(1,''); setDir('short'); });
  await p.waitForTimeout(400);
  const all = await p.evaluate(()=>({btn:document.getElementById('dir_s').classList.contains('on'),
    now:[...document.querySelectorAll('#dirRows .now')].map(x=>x.textContent)}));
  ok('全体「短手」でボタンが点く', all.btn, all.now.join(','));

  console.log(R.join('\n'));
  console.log(errs.length?'JSエラー:\n'+errs.join('\n'):'JSエラーなし');
  await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
