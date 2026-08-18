/* ★2026-08-15 面（部位）の内訳の試作
   使い方: node faces1.js        （パソコン 1600px）
           node faces1.js ph     （スマホたて） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
const NAME='三井アウトレットパーク札幌北広島 屋上防水';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext(PH
    ?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
    :{viewport:{width:1600,height:900}});
  if(PH) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(700);
  /* 対象の物件を検索で1件に絞る */
  await p.evaluate(n=>{ const i=document.getElementById('q'); i.value='三井アウトレット'; i.dispatchEvent(new Event('input',{bubbles:true})); }, NAME);
  await p.waitForTimeout(700);

  const g=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard'); if(!c)return null;
    const q=c.querySelector('.qsum'), btn=c.querySelector('.fcbtn');
    const cells=[...c.querySelectorAll('.r1 .qsum')].map(x=>x.textContent.replace(/\s+/g,' ').trim());
    return {cards:document.querySelectorAll('#list .pcard').length,
      cells, hasBtn:!!btn, open:c.classList.contains('fcopen'),
      panelShown:c.querySelector('.pfaces')?getComputedStyle(c.querySelector('.pfaces')).display:'なし',
      rows:c.querySelectorAll('.fcrow').length, h:Math.round(c.getBoundingClientRect().height/(window.nnPZ||1))};
  });
  console.log('閉じている状態', JSON.stringify(g));
  ok('対象の物件が1件に絞れた', g && g.cards===1, g&&g.cards+'件');
  ok('数量は「合計 3,100㎡＋180m（20面）」', /合計 3,100㎡＋180m（20面）/.test(g.cells.join(' ')), g.cells.join(' / '));
  ok('改修仕様は「主たる工法 ほか4工法」', /ほか4工法/.test(g.cells.join(' ')), g.cells.join(' / '));
  ok('「内訳」ボタンがある', g.hasBtn);
  ok('既定は閉じている（カードは今までどおりの高さ）', g.panelShown==='none' && g.h<=(PH?345:345), g.panelShown+' / '+g.h+'px');
  ok('内訳は20面ぶん用意されている', g.rows===20, g.rows+'行');

  /* 開く */
  await p.click('#list .pcard .fcbtn'); await p.waitForTimeout(400);
  const o=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    const vis=[...c.querySelectorAll('.fcrow')].filter(r=>r.offsetHeight>0).length;
    return {open:c.classList.contains('fcopen'), vis, btn:c.querySelector('.fcbtn').textContent,
      more:!!c.querySelector('.fcmore'), tot:(c.querySelector('.fctot')||{}).textContent,
      h:Math.round(c.getBoundingClientRect().height/(window.nnPZ||1)),
      armed:c.classList.contains('armed'),
      detail:document.getElementById('mainview').classList.contains('show-detail')};
  });
  console.log('開いた状態', JSON.stringify(o));
  ok('押すと開く', o.open && o.btn.indexOf('▴')>=0, o.btn);
  ok('最初は3面だけ見える', o.vis===3, o.vis+'面');
  ok('「ほか17面をすべて見る」がある', o.more);
  ok('工法ごとの小計が出る', /塩ビシート 機械的固定工法 2,222㎡/.test((o.tot||'').replace(/\s+/g,' ')), o.tot);
  /* ★2026-08-15f 着色（sel）は「どこを押しても付く」に変えたので、ここでは見ない。
     大事なのは**詳細へ飛ばないこと**と、次のクリックで飛ぶ待機（armed）が付かないこと。 */
  ok('★内訳を押しても詳細へ飛ばない・次のクリックでも飛ばない',
     o.armed===false && o.detail===false, JSON.stringify({armed:o.armed,detail:o.detail}));

  /* すべて見る */
  await p.click('#list .pcard .fcmore'); await p.waitForTimeout(400);
  const a=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    const vis=[...c.querySelectorAll('.fcrow')].filter(r=>r.offsetHeight>0).length;
    return {vis, more:!!c.querySelector('.fcmore'),
      h:Math.round(c.getBoundingClientRect().height/(window.nnPZ||1)),
      over:c.scrollWidth>c.clientWidth+2, body:document.body.scrollWidth-document.body.clientWidth};
  });
  console.log('すべて見る', JSON.stringify(a));
  ok('20面すべて出る', a.vis===20, a.vis+'面');
  ok('横はみ出し0', !a.over && a.body<=0, JSON.stringify(a));

  /* 内訳の無い物件は今までどおり */
  await p.evaluate(()=>{ const i=document.getElementById('q'); i.value='太平医院'; i.dispatchEvent(new Event('input',{bubbles:true})); });
  await p.waitForTimeout(700);
  const n=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard'); if(!c)return null;
    const m=c.querySelector('.ebox[data-f="m"]');
    return {qty:m?m.textContent.replace(/\s+/g,' ').trim():'なし', btn:!!c.querySelector('.fcbtn'),
      kou:!!c.querySelector('.ebox[data-f="kouhou"]'),
      h:Math.round(c.getBoundingClientRect().height/(window.nnPZ||1))};
  });
  console.log('内訳の無い物件', JSON.stringify(n));
  ok('面が1つの物件は今までどおり（内訳ボタン無し）', n && !n.btn, JSON.stringify(n));
  ok('その場編集も今までどおり効く（数量・改修仕様の囲み）', n && /数量333㎡/.test(n.qty.replace(/\s/g,'')) && n.kou, n&&n.qty);
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n'+(PH?'【スマホたて】':'【パソコン 1600px】'));
  console.log(R.join('\n'));
  await b.close();
})();
