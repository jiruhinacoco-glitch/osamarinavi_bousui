/* ★2026-08-14g 新規物件作成フォームが現場記録帳の中身と合っているか */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);

  /* ① 実データの工法が全部そろっているか */
  const ko=await p.evaluate(()=>{
    openModal();
    const opts=[...document.getElementById('f_ko').options].map(o=>o.value);
    const used=[...new Set(props.map(x=>x.kouhou))];
    return {opts, used, missing:used.filter(k=>!opts.includes(k))};
  });
  console.log('工法', JSON.stringify(ko.missing), '選択肢', ko.opts.length, '件');
  ok('実データの工法がすべて選べる', ko.missing.length===0, JSON.stringify(ko.missing));
  ok('選択肢は10件（実データ9＋シーリング）', ko.opts.length===10, String(ko.opts.length));

  /* ② 既存防水・区分・構造体がある */
  const add=await p.evaluate(()=>{
    const g=k=>document.getElementById(k);
    return {kizon:g('f_kizon')?[...g('f_kizon').options].length:0,
      kind:g('f_kind')?[...g('f_kind').options].length:0,
      kouzou:g('f_kouzou')?[...g('f_kouzou').options].length:0,
      tag:!!g('f_deftag'), tagDisabled:g('f_deftag')?g('f_deftag').disabled:null};
  });
  console.log('追加項目', JSON.stringify(add));
  ok('既存防水の欄がある（8種）', add.kizon===8, String(add.kizon));
  ok('区分の欄がある（4種）', add.kind===4, String(add.kind));
  ok('構造体の欄がある（5種）', add.kouzou===5, String(add.kouzou));
  ok('不具合タグの入口がある', add.tag===true);
  ok('新規のときタグは押せない（保存後に選ぶ）', add.tagDisabled===true);

  /* ③ 新規に登録すると、追加した項目が一覧に反映される */
  const made=await p.evaluate(async()=>{
    const g=k=>document.getElementById(k);
    g('f_name').value='検証テスト物件';
    g('f_addr').value='札幌市中央区1条1丁目';
    g('f_moto').value='テスト建設';
    g('f_st').value='施工中';
    g('f_ko').value='塩ビシート 機械的固定工法(S-M1)';
    g('f_m').value='300'; g('f_tan').value='9000';
    g('f_kizon').value='塩ビシート防水（接着）'; g('f_kind').value='部分補修'; g('f_kouzou').value='S';
    g('f_p').value='40';
    saveProperty();
    await new Promise(z=>setTimeout(z,600));
    const q=props.find(x=>x.name==='検証テスト物件');
    return q?{spec:q.spec, hou:q.hou, maker:q.maker, makerFull:q.makerFull, sozai:q.sozai,
      kizon:q.kizon, kind:q.kind, kouzou:q.kouzou, order:q.order, prog:q.prog, st:q.stRaw}:null;
  });
  console.log('登録した物件', JSON.stringify(made));
  ok('工法から記号が入る', made && made.spec==='S-M1', made&&made.spec);
  ok('メーカーは省略名で入る', made && made.maker==='ヤマデ', made&&made.maker);
  ok('正式名も残る', made && made.makerFull==='アーキヤマデ', made&&made.makerFull);
  ok('既存防水が保存される', made && made.kizon==='塩ビシート防水（接着）', made&&made.kizon);
  ok('区分が保存される', made && made.kind==='部分補修', made&&made.kind);
  ok('構造体が保存される', made && made.kouzou==='S', made&&made.kouzou);
  ok('請負額が数量×単価で自動計算', made && made.order===2700000, made&&made.order);

  /* 一覧のカードにも出る */
  const card=await p.evaluate(async()=>{
    showView('list'); await new Promise(z=>setTimeout(z,700));
    const q=props.find(x=>x.name==='検証テスト物件');
    const c=[...document.querySelectorAll('#list .pcard')].find(x=>+x.dataset.pid===q.id);
    if(!c)return null;
    const t=s=>{const e=c.querySelector(s); return e?e.textContent.trim():null;};
    return {kizon:t('[data-f="kizon"]'), kind:t('[data-f="kind"]'), kouzou:t('[data-f="kouzou"]'),
      spec:t('.badge'), maker:t('.mkchip'), prog:t('.pprog .pv')};
  });
  console.log('一覧カード', JSON.stringify(card));
  ok('一覧に既存防水が出る', card && /塩ビシート防水（接着）/.test(card.kizon||''), card&&card.kizon);
  ok('一覧に区分が出る', card && /部分補修/.test(card.kind||''), card&&card.kind);
  ok('一覧に構造体が出る', card && /S/.test(card.kouzou||''), card&&card.kouzou);
  ok('一覧に記号が出る', card && card.spec==='S-M1', card&&card.spec);
  ok('進行度が出る', card && card.prog==='40%', card&&card.prog);

  /* ④ 既存の物件を編集で開いても工法がすり替わらない */
  const keep=await p.evaluate(async()=>{
    const q=props.find(x=>x.kouhou==='改質アスファルトシート トーチ工法(AS-T1)');
    openModal(q.id);
    await new Promise(z=>setTimeout(z,300));
    const v=document.getElementById('f_ko').value;
    const kz=document.getElementById('f_kizon').value;
    closeModal();
    return {want:q.kouhou, got:v, kizon:kz};
  });
  ok('編集で開いても工法が変わらない（AS-T1）', keep.want===keep.got, keep.got);
  ok('編集のとき既存防水も入る', !!keep.kizon, keep.kizon);

  /* ★2026-08-14i 窓が画面より高くなって上（工事名）が切れないか・文字が大きすぎないか */
  const box=await p.evaluate(async()=>{
    openModal(); await new Promise(z=>setTimeout(z,400));
    const Z=window.nnPZ||1;
    const m=document.querySelector('#modalbg .modal'), r=m.getBoundingClientRect();
    const nm=document.getElementById('f_name'), nr=nm.getBoundingClientRect();
    const h3=document.querySelector('#modalbg .modal h3').getBoundingClientRect();
    return {top:Math.round(r.top), vh:innerHeight, Z:+Z.toFixed(2),
      titleVisible:h3.top>=0, nameVisible:nr.top>=0 && nr.bottom<=innerHeight,
      font:getComputedStyle(nm).fontSize, inH:Math.round(nr.height/Z),
      canScroll:m.scrollHeight>m.clientHeight};
  });
  console.log('窓', JSON.stringify(box));
  ok('窓が画面からはみ出さない（上が切れない）', box.top>=0, box.top+'px');
  ok('見出しが見えている', box.titleVisible===true);
  ok('工事名の欄が画面内にある（入力できる）', box.nameVisible===true);
  /* ★2026-08-15c 3列の横長にしたので、さらに1段詰めて12.5px/25px（1画面で完結が目的） */
  ok('パソコンの入力欄は12.5px（大きすぎない）', box.font==='12.5px', box.font);
  ok('入力欄の高さは27px以内', box.inH<=27, box.inH+'px');
  ok('★スクロールなしで全部見える（1画面で完結）', box.canScroll===false, 'canScroll='+box.canScroll);
  await p.evaluate(()=>closeModal());

  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n'+R.join('\n'));
  await b.close();
})();
