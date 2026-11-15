/* ★2026-11-03 巡回：1500px以上はPC2列（案B §1024）で欄を減らしたので、1列の1400pxで確かめる */
/* 既存の状態（既存防水・区分・構造体）／写真長押し／チップ名／物件名の大きさ */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
for(const [mode,vp] of [['pc',{width:1400,height:900}]]){   /* ★2026-11-15 スマホのカードは作り変わり、左の既存・区分・構造の箱（.pexist）が無い（詳細・カードの表から直す）→ PC だけ */
  console.log('\n===== '+mode+' =====');
  const ctx=await b.newContext({viewport:vp, deviceScaleFactor:mode==='pc'?1:2, isMobile:mode!=='pc', hasTouch:mode!=='pc'});
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(mode!=='pc') await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1300);
  const r=await p.evaluate(()=>{
    const Z=window.nnPZ||1;
    const chips=[...document.querySelectorAll('#chips .dfil .stchip')].map(x=>x.textContent.replace(/[▼\d]/g,'').trim());
    const c=document.querySelector('#list .pcard');
    const ph=c.querySelector('.pph').getBoundingClientRect();
    const ex=c.querySelector('.pexist');
    const exb=ex.getBoundingClientRect();
    const card=c.getBoundingClientRect();
    const ttl=parseFloat(getComputedStyle(c.querySelector('.ebox.ttl')).fontSize)/Z;
    const lc=document.getElementById('nnLC').getBoundingClientRect();
    const chipsBox=document.getElementById('chips').getBoundingClientRect();
    return {chips,
      exFields:[...ex.querySelectorAll('.ebox')].map(x=>x.dataset.f),
      exTexts:[...ex.querySelectorAll('.ebox')].map(x=>x.textContent.trim()),
      exUnderPhoto: exb.top>=ph.bottom-1,
      exInside: exb.bottom<=card.bottom+1 && exb.left>=card.left-1,
      ttl, chipsOverlap: chipsBox.right>lc.left+1,
      overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
  });
  ok(r.chips.every(x=>!/別$/.test(x)||x==='工事種別'||x==='請負種別'),'チップから「別」が消えた（★「工事種別」「請負種別」は本人の指示で付けた名前なので除く）', r.chips.join(' / '));
  ok(JSON.stringify(r.exFields)===JSON.stringify(['kizon','kind','kouzou']),'既存・区分・構造の3つがある', r.exFields.join(','));
  ok(r.exUnderPhoto,'写真の真下にある');
  ok(r.exInside,'カードの枠の中に収まっている');
  ok(r.overflow<=0,'横はみ出しなし', r.overflow);
  console.log('   中身:', r.exTexts.join(' ／ '), '／物件名', r.ttl+'px');
  if(mode==='pc') ok(r.ttl>=17,'物件名が大きくなった（15.5→18px）', r.ttl+'px');
  else ok(r.ttl>=14,'スマホの物件名も大きく（12.5→14.5px）', r.ttl+'px');

  /* 選択の切り替え */
  await p.click('#list .pcard .pexist .ebox[data-f="kind"]'); await p.waitForTimeout(250);
  const opts=await p.evaluate(()=>{const s=document.querySelector('#list .pcard .pexist select');
    return s?[...s.options].map(o=>o.value):null;});
  ok(opts && opts.join(',')==='新築,改修,増改築,部分補修','区分は4つから選べる', (opts||[]).join(','));
  await p.evaluate(()=>{const s=document.querySelector('#list .pcard .pexist select'); s.value='増改築'; s.dispatchEvent(new Event('change'));});
  await p.waitForTimeout(600);
  const kv=await p.evaluate(()=>props.find(x=>x.id===+document.querySelector('#list .pcard').dataset.pid).kind);
  ok(kv==='増改築','区分が保存される', kv);
  await p.click('#list .pcard .pexist .ebox[data-f="kouzou"]'); await p.waitForTimeout(250);
  const o2=await p.evaluate(()=>{const s=document.querySelector('#list .pcard .pexist select'); return s?[...s.options].map(o=>o.value).join(','):null;});
  ok(o2==='RC,S,ALC,W,RCS,SRC','構造体は RC/S/ALC/W/RCS/SRC（★11-12w で SRC を足した）', o2);
  /* ★2026-08-15e から選択肢は1クリックで開く（showPicker）。開きっぱなしの一覧が
     次のクリックを食うので、Escape＋blur＋検索欄クリックで閉じてから次へ。 */
  await p.keyboard.press('Escape');
  await p.evaluate(()=>{ if(document.activeElement)document.activeElement.blur(); });
  await p.click('#q'); await p.evaluate(()=>document.getElementById('q').blur());
  await p.waitForTimeout(400);
  /* ★2026-11-15 既存防水の箱は写真の下（.pexist）から、屋根の段の「既存」へ移った → 見えている既存の箱を押す */
  await p.evaluate(()=>{ const e=[...document.querySelectorAll('#list .pcard:first-child .ebox[data-f="kizon"]')].find(x=>x.offsetParent&&x.getBoundingClientRect().width>0); e&&e.click(); }); await p.waitForTimeout(400);
  const o3=await p.evaluate(()=>{const s=document.querySelector('#list .pcard:first-child .ebox[data-f="kizon"] select'); return s?s.options.length:0;});
  const kzShown=await p.evaluate(()=>[...document.querySelectorAll('#list .pcard:first-child .ebox[data-f="kizon"]')].some(x=>x.offsetParent&&x.getBoundingClientRect().width>0));
  /* ★2026-11-15 1列のカードでは既存防水は屋根ごとの段で見せ、カード全体の既存の箱は出さない作り → 箱が出ているときだけ一覧を確かめる */
  ok(!kzShown||o3>=8,'既存防水の一覧が出る（箱が出ているとき）', kzShown?o3+'種':'箱なし（屋根ごとの段で表示）');
  await p.keyboard.press('Escape');

  /* ★2026-08-13k 写真は1タップで選択窓が開く（label 方式）。長押しは廃止した。 */
  const lp=await p.evaluate(()=>{
    const ph=document.querySelector('#list .pcard .pph');
    const lb=ph.querySelector('label.phfull'), inp=ph.querySelector('input.phinp');
    return lb&&inp? {ok:lb.htmlFor===inp.id, accept:inp.accept}:null;
  });
  ok(lp && lp.ok && /image/.test(lp.accept||''),'写真をタップすると画像の選択が開く', JSON.stringify(lp));
  ok(errs.length===0,'JSエラーなし', errs.join('|').slice(0,180));
  await p.screenshot({path:'exist1_'+mode+'.png'});
  await ctx.close();
}
await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');})();
