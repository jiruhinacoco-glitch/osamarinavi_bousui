/* ★2026-08-15b 新規物件登録・編集の「屋根・部位の内訳」
   使い方: node faces3.js */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext({viewport:{width:1600,height:1000}});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  p.on('dialog',d=>d.accept());
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(700);

  /* ① 新規登録で2面入れる */
  await p.evaluate(()=>openModal()); await p.waitForTimeout(400);
  const f0=await p.evaluate(()=>({rows:document.querySelectorAll('#f_faceRows .ffrow').length,
    mRO:document.getElementById('f_m').readOnly}));
  ok('新規は内訳0行から（数量は手入力のまま）', f0.rows===0 && !f0.mRO, JSON.stringify(f0));
  await p.evaluate(()=>{
    document.getElementById('f_name').value='テスト倉庫 屋上防水改修';
    document.getElementById('f_addr').value='札幌市白石区テスト1丁目';
    document.getElementById('f_moto').value='テスト建設（株）';
    document.getElementById('f_tan').value=9000;
    nnFFAdd({n:'A棟 屋上', ko:'塩ビシート 機械固定(S-M2)', q:800});
    nnFFAdd({n:'渡り廊下', ko:'ウレタン塗膜 通気緩衝工法(X-1)', q:200});
    nnFFAdd({n:'目地シール', ko:'ウレタン塗膜 密着工法(X-2)', q:120, un:'m'});
  });
  await p.waitForTimeout(300);
  const f1=await p.evaluate(()=>({
    m:document.getElementById('f_m').value, mRO:document.getElementById('f_m').readOnly,
    un:document.getElementById('f_un').value, unDis:document.getElementById('f_un').disabled,
    ko:document.getElementById('f_ko').value, koDis:document.getElementById('f_ko').disabled,
    sum:document.getElementById('f_faceSum').textContent}));
  console.log('入力後', JSON.stringify(f1));
  ok('数量＝㎡の合計1000で自動・手入力不可', f1.m==='1000' && f1.mRO, f1.m);
  ok('工法＝面積最大の塩ビに自動', /塩ビシート 機械固定/.test(f1.ko) && f1.koDis, f1.ko);
  ok('合計の案内が出る（1,000㎡＋120m・3面・3工法）', /1,000㎡＋120m（3面・3工法）/.test(f1.sum), f1.sum);

  /* ✕で1行消すと合計が追従 */
  await p.evaluate(()=>{ document.querySelectorAll('#f_faceRows .ffx')[2].click(); });
  await p.waitForTimeout(200);
  const f2=await p.evaluate(()=>({m:document.getElementById('f_m').value,
    sum:document.getElementById('f_faceSum').textContent}));
  ok('行を消すと合計が追従（120mが消える）', f2.m==='1000' && !/120m/.test(f2.sum), f2.sum);
  await p.evaluate(()=>nnFFAdd({n:'目地シール', ko:'ウレタン塗膜 密着工法(X-2)', q:120, un:'m'}));
  await p.waitForTimeout(200);

  /* 保存 → 一覧に内訳ボタン付きで出る */
  await p.evaluate(()=>saveProperty()); await p.waitForTimeout(900);
  const c1=await p.evaluate(()=>{
    const c=[...document.querySelectorAll('#list .pcard')].find(x=>x.innerText.indexOf('テスト倉庫')>=0);
    if(!c)return null;
    const qs=[...c.querySelectorAll('.qsum')].map(x=>x.textContent).join(' ');
    return {qty:qs, btn:!!c.querySelector('.fcbtn'),
      rows:c.querySelectorAll('.fcrow').length,
      store:JSON.parse(localStorage.getItem('nn_kirokucho_faces_v1')||'{}')['テスト倉庫 屋上防水改修']};
  });
  console.log('保存後', JSON.stringify(c1));
  ok('保存した物件のカードに「合計＋面数＋内訳」が出る',
     c1 && /1,000㎡＋120m（3面）/.test((c1.qty||'').replace(/\s/g,'')) && c1.btn && c1.rows===3,
     c1&&c1.qty);
  ok('localStorage に保存されている', c1 && c1.store && c1.store.length===3, JSON.stringify(c1&&c1.store&&c1.store.map(f=>f.n)));

  /* ② 編集で開くと行が入っている／1面消して保存し直す */
  await p.evaluate(()=>{ const q=document.getElementById('q'); q.value='テスト倉庫'; q.dispatchEvent(new Event('input',{bubbles:true})); });
  await p.waitForTimeout(500);
  await p.evaluate(()=>{ const c=document.querySelector('#list .pcard'); openModal(+c.dataset.pid); });
  await p.waitForTimeout(400);
  const e1=await p.evaluate(()=>({rows:document.querySelectorAll('#f_faceRows .ffrow').length,
    m:document.getElementById('f_m').value}));
  ok('編集で開くと3行入っている・数量は合計のまま', e1.rows===3 && e1.m==='1000', JSON.stringify(e1));
  await p.evaluate(()=>{ document.querySelectorAll('#f_faceRows .ffx')[1].click(); saveProperty(); });
  await p.waitForTimeout(900);
  const e2=await p.evaluate(()=>{
    const c=[...document.querySelectorAll('#list .pcard')].find(x=>x.innerText.indexOf('テスト倉庫')>=0);
    const pr=props.find(x=>x.name==='テスト倉庫 屋上防水改修');
    return {rows:c?c.querySelectorAll('.fcrow').length:0, m:pr&&pr.m};
  });
  ok('1面消して保存し直すと2面になる・数量も800に', e2.rows===2 && e2.m===800, JSON.stringify(e2));

  /* ③ ページを読み直しても残る */
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(700);
  const r1=await p.evaluate(()=>{
    const t=window.nnFaceQtyText&&nnFaceQtyText('テスト倉庫 屋上防水改修');
    return {t};
  });
  ok('再読み込み後も内訳が残る', r1.t==='800㎡＋120m（2面）', r1.t);

  /* ④ 現場マップも同じ内訳を読む（同じ保存場所を見るため） */
  const p2=await ctx.newPage();
  await p2.route('**maps.googleapis.com**', r=>r.abort());
  await p2.addInitScript(()=>{ localStorage.setItem('osamari_maps_key','dummy'); });
  await p2.goto('http://localhost:8899/genba_map_v36.html'); await p2.waitForTimeout(1500);
  const m1=await p2.evaluate(()=>({
    t:window.nnFaceQtyText&&nnFaceQtyText('テスト倉庫 屋上防水改修'),
    k:window.nnFaceKoText&&nnFaceKoText('テスト倉庫 屋上防水改修')}));
  ok('現場マップからも同じ数字が引ける', m1.t==='800㎡＋120m（2面）' && /ほか1工法/.test(m1.k||''), JSON.stringify(m1));

  /* ⑤ 実在の物件（太平医院）に内訳を付けて→全部消して→ゴミが残らないこと
     （★テスト物件は保存されない＝再読み込みで消えるので、こちらで確かめる） */
  await p.bringToFront();
  await p.evaluate(()=>{ const q=document.getElementById('q'); q.value='太平医院'; q.dispatchEvent(new Event('input',{bubbles:true})); });
  await p.waitForTimeout(500);
  await p.evaluate(()=>{ const c=document.querySelector('#list .pcard'); openModal(+c.dataset.pid); });
  await p.waitForTimeout(400);
  await p.evaluate(()=>{
    nnFFAdd({n:'本館 屋上', ko:'ウレタン塗膜 通気緩衝工法(X-1)', q:250});
    nnFFAdd({n:'渡り廊下', ko:'ウレタン塗膜 密着工法(X-2)', q:83});
    saveProperty();
  });
  await p.waitForTimeout(900);
  const t1=await p.evaluate(()=>{
    const c=[...document.querySelectorAll('#list .pcard')].find(x=>x.innerText.indexOf('太平医院')>=0);
    return {btn:!!c.querySelector('.fcbtn'), rows:c.querySelectorAll('.fcrow').length};
  });
  ok('実在の物件にも内訳を付けられる（2面）', t1.btn && t1.rows===2, JSON.stringify(t1));
  await p.evaluate(()=>{ const c=[...document.querySelectorAll('#list .pcard')].find(x=>x.innerText.indexOf('太平医院')>=0); openModal(+c.dataset.pid); });
  await p.waitForTimeout(400);
  await p.evaluate(()=>{ document.querySelectorAll('#f_faceRows .ffx').forEach(x=>x.click()); });
  await p.waitForTimeout(200);
  const z1=await p.evaluate(()=>({mRO:document.getElementById('f_m').readOnly,
    koDis:document.getElementById('f_ko').disabled}));
  ok('全部消すと数量・工法が手入力に戻る', !z1.mRO && !z1.koDis, JSON.stringify(z1));
  await p.evaluate(()=>saveProperty()); await p.waitForTimeout(900);
  const z2=await p.evaluate(()=>{
    const c=[...document.querySelectorAll('#list .pcard')].find(x=>x.innerText.indexOf('太平医院')>=0);
    return {btn:!!c.querySelector('.fcbtn'),
      key:'太平医院 屋上防水改修' in JSON.parse(localStorage.getItem('nn_kirokucho_faces_v1')||'{}')};
  });
  ok('内訳ボタンが消え、保存のゴミも残らない', !z2.btn && !z2.key, JSON.stringify(z2));

  /* あと片付け：テスト用の保存キーを消す */
  await p.evaluate(()=>{
    const st=JSON.parse(localStorage.getItem('nn_kirokucho_faces_v1')||'{}');
    delete st['テスト倉庫 屋上防水改修'];
    localStorage.setItem('nn_kirokucho_faces_v1', JSON.stringify(st));
  });
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log(R.join('\n'));
  await b.close();
})();
