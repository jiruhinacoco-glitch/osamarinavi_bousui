/* ★2026-08-14f ①上のタブの余白を詰めた ②進行度の見出し ③既存・区分・構造の絵の枠 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext(PH?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
    :{viewport:{width:1600,height:900}});
  if(PH) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);

  const m=await p.evaluate(()=>{
    const Z=window.nnPZ||1, H=e=>Math.round(e.getBoundingClientRect().height/Z);
    const c=document.querySelector('#list .pcard');
    const tb=document.getElementById('viewtabs');
    const btn=tb.querySelector('button');
    const ex=[...c.querySelectorAll('.pexist .exicon')];
    const pr=c.querySelector('.pprog');
    return {tabs:H(tb), btnPad:getComputedStyle(btn).paddingTop,
      card:H(c), listTop:Math.round(document.getElementById('list').getBoundingClientRect().top/Z),
      lbl:pr.querySelector('.plbl')?pr.querySelector('.plbl').textContent:null,
      lblAbove:(()=>{const l=c.querySelector('.pprog .plbl'),bar=c.querySelector('.pprog .prog');
        return !!l&&!!bar&&l.getBoundingClientRect().right<=bar.getBoundingClientRect().left+2;})(),
      exN:ex.length, exW:ex.length?Math.round(ex[0].getBoundingClientRect().width/Z):0,
      exDash:ex.length?getComputedStyle(ex[0]).borderStyle:null,
      exFiles:['kizon','kind','kouzou'].map(k=>window.nnExIconFile?nnExIconFile(k,
        k==='kizon'?'塩ビシート防水':k==='kind'?'改修':'RC'):null),
      rowsOk:[...c.querySelectorAll('.pexist .pexrow')].length};
  });
  console.log(JSON.stringify(m));
  ok('タブの帯が薄くなった（45px以内）', m.tabs<=45, m.tabs+'px');
  ok('一覧の開始が上がった（145px以内）', m.listTop<=145, m.listTop+'px');
  ok('進行度の見出しがある', m.lbl==='進行度', String(m.lbl));
  ok('見出しはバーの左にある（2026-08-16z：写真の下の1行組みに変更）', m.lblAbove===true);
  ok('既存・区分・構造に枠が3つ', m.exN===3 && m.rowsOk===3, m.exN+' / '+m.rowsOk);
  ok('絵が無い間は点線の枠', m.exDash==='dashed', String(m.exDash));
  ok('ファイル名は icons/<種類>_<キー>.png',
     m.exFiles.join(',')==='./icons/kizon_enbi.png,./icons/kind_kaishu.png,./icons/kouzou_rc.png',
     JSON.stringify(m.exFiles));
  if(!PH) ok('カードの高さは 345px 以内のまま', m.card<=345, m.card+'px');
  /* 絵を置いたら差し替わる */
  const swap=await p.evaluate(async()=>{
    const f=nnExIconFile('kizon','不明'); nnExIconState[f]='ok'; render();
    await new Promise(z=>setTimeout(z,400));
    const e=document.querySelector('#list .pcard .exicon');
    return {has:e.classList.contains('has'), img:!!e.querySelector('img')};
  });
  ok('絵があれば枠が絵に変わる', swap.has&&swap.img, JSON.stringify(swap));
  const probes=await p.evaluate(()=>Object.keys(nnExIconState).length);
  ok('確かめる回数は種類の数だけ（100件ぶん取りに行かない）', probes<=25, probes+'種');
  const over=await p.evaluate(()=>{
    let n=0; document.querySelectorAll('#list .pcard').forEach(c=>{ if(c.scrollWidth>c.clientWidth+2)n++; });
    return {n, body:document.body.scrollWidth-document.body.clientWidth};
  });
  ok('横はみ出し0', over.n===0 && over.body<=0, JSON.stringify(over));
  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n'+(PH?'【スマホたて】':'【パソコン】')); console.log(R.join('\n'));
  await b.close();
})();
