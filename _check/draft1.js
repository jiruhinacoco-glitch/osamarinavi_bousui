/* ★2026-08-15c 新規物件登録：1画面で完結（3列）＋✕＋下書きの自動セーブ
   使い方: node draft1.js [w] [h]   既定 1366x720（いちばん低い画面で確かめる） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const W=+(process.argv[2]||1366), H=+(process.argv[3]||720);
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext({viewport:{width:W,height:H}});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);

  /* ① 1画面で完結しているか（スクロール不要・全部の欄が見える） */
  await p.evaluate(()=>openModal()); await p.waitForTimeout(400);
  const g1=await p.evaluate(()=>{
    const m=document.querySelector('#modalbg .modal');
    const ids=['f_name','f_ko','f_sh','f_a3','f_tb','f_deftag'];
    const seen=ids.map(k=>{ const r=document.getElementById(k).getBoundingClientRect();
      return r.top>=0 && r.bottom<=innerHeight; });
    const btns=m.querySelector('.btns').getBoundingClientRect();
    return {scroll:m.scrollHeight-m.clientHeight, seen, cols:getComputedStyle(m.querySelector('.mwrap')).gridTemplateColumns.split(' ').length,
      btnsVisible:btns.bottom<=innerHeight, close:!!m.querySelector('.mclose'),
      w:Math.round(m.getBoundingClientRect().width), h:Math.round(m.getBoundingClientRect().height)};
  });
  console.log('①', JSON.stringify(g1));
  ok('スクロールなしの1画面で完結', g1.scroll<=0, 'あまり'+g1.scroll+'px');
  ok('最初の欄から最後の欄・保存ボタンまで全部見える', g1.seen.every(Boolean)&&g1.btnsVisible, JSON.stringify(g1.seen));
  ok('パソコンは3列', g1.cols===3, g1.cols+'列');
  ok('右上に✕がある', g1.close);

  /* ✕で閉じる */
  await p.evaluate(()=>document.querySelector('#modalbg .mclose').click());
  await p.waitForTimeout(300);
  ok('✕で閉じる', await p.evaluate(()=>!document.getElementById('modalbg').classList.contains('open')));

  /* ② 自動セーブ：打って→✕で閉じて→開き直すと復元 */
  await p.evaluate(()=>openModal()); await p.waitForTimeout(300);
  await p.evaluate(()=>{
    const set=(k,v)=>{ const e=document.getElementById(k); e.value=v; e.dispatchEvent(new Event('input',{bubbles:true})); };
    set('f_name','下書きテスト 屋上防水');
    set('f_addr','札幌市厚別区テスト2丁目');
    set('f_tan','9500');
    nnFFAdd({n:'A棟', ko:'ウレタン塗膜 通気緩衝工法(X-1)', q:300});
  });
  await p.waitForTimeout(700);   /* 自動セーブ（0.4秒）を待つ */
  const d1=await p.evaluate(()=>{
    const d=JSON.parse(localStorage.getItem('nn_kirokucho_draft_v1')||'null');
    return {saved:!!d, name:d&&d.v.f_name, faces:d&&d.faces.length,
      info:document.getElementById('f_draftInfo').textContent};
  });
  console.log('②', JSON.stringify(d1));
  ok('打つそばから自動セーブされる', d1.saved && d1.name==='下書きテスト 屋上防水' && d1.faces===1, JSON.stringify(d1));
  ok('「✓ 下書きを自動保存」の表示が出る', /自動保存/.test(d1.info), d1.info);
  await p.evaluate(()=>document.querySelector('#modalbg .mclose').click());
  await p.waitForTimeout(300);
  await p.evaluate(()=>openModal()); await p.waitForTimeout(400);
  const d2=await p.evaluate(()=>({
    name:document.getElementById('f_name').value,
    tan:document.getElementById('f_tan').value,
    rows:document.querySelectorAll('#f_faceRows .ffrow').length,
    info:document.getElementById('f_draftInfo').textContent}));
  console.log('復元', JSON.stringify(d2));
  ok('✕で閉じても、開き直すと続きから', d2.name==='下書きテスト 屋上防水' && d2.tan==='9500' && d2.rows===1, JSON.stringify(d2));
  ok('復元した旨の表示', /復元/.test(d2.info), d2.info);

  /* ③ ページを読み直しても下書きが残る */
  await p.reload({waitUntil:'load'}); await p.waitForTimeout(1800);
  await p.evaluate(()=>openModal()); await p.waitForTimeout(400);
  const d3=await p.evaluate(()=>({name:document.getElementById('f_name').value,
    rows:document.querySelectorAll('#f_faceRows .ffrow').length}));
  ok('再読み込み後も下書きが残る', d3.name==='下書きテスト 屋上防水' && d3.rows===1, JSON.stringify(d3));

  /* ④ 「下書き保存して閉じる」ボタン */
  const d4=await p.evaluate(()=>{ nnDraftSaveClose();
    return {closed:!document.getElementById('modalbg').classList.contains('open'),
      saved:!!localStorage.getItem('nn_kirokucho_draft_v1')};});
  ok('下書き保存して閉じるボタンが効く', d4.closed && d4.saved, JSON.stringify(d4));

  /* ⑤ 本登録すると下書きが消える */
  await p.evaluate(()=>openModal()); await p.waitForTimeout(400);
  await p.evaluate(()=>saveProperty()); await p.waitForTimeout(700);
  const d5=await p.evaluate(()=>({
    draft:localStorage.getItem('nn_kirokucho_draft_v1'),
    made:!!props.find(x=>x.name==='下書きテスト 屋上防水')}));
  ok('保存すると物件になり、下書きは消える', d5.made && !d5.draft, JSON.stringify({draft:!!d5.draft,made:d5.made}));

  /* ⑥ 編集（既存物件）では下書きに触らない・下書きボタンも出ない */
  await p.evaluate(()=>{ const pr=props.find(x=>x.stRaw==='kou'); openModal(pr.id); });
  await p.waitForTimeout(400);
  const d6=await p.evaluate(()=>{
    const e=document.getElementById('f_name');
    e.value=e.value+'X'; e.dispatchEvent(new Event('input',{bubbles:true}));
    return new Promise(r=>setTimeout(()=>r({
      draft:localStorage.getItem('nn_kirokucho_draft_v1'),
      btn:document.getElementById('f_draftBtn').style.display}),700));
  });
  ok('編集では自動セーブしない・下書きボタンも出ない', !d6.draft && d6.btn==='none', JSON.stringify(d6));
  await p.evaluate(()=>closeModal());

  /* あと片付け */
  await p.evaluate(()=>localStorage.removeItem('nn_kirokucho_draft_v1'));
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n【'+W+'x'+H+'】');
  console.log(R.join('\n'));
  await b.close();
})();
