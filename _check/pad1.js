/* 発注の数字パッド（2026-08-18b）：たて／よこ両方 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+JSON.stringify(ex):''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [w,h,name] of [[852,393,'よこ'],[393,852,'たて']]){
    const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
    await p.goto('http://localhost:8899/hacchu.html',{waitUntil:'load'}); await p.waitForTimeout(2200);
    await p.evaluate(()=>{ const g=GENBA.find(g=>g.st==='契約済'); startDraft(g.id); }); await p.waitForTimeout(400);
    /* 数量欄をタップ → パッドが開く・キーボードのフォーカスは当たらない */
    await p.tap('#content input.qty');
    await p.waitForTimeout(300);
    const r=await p.evaluate(()=>({open:document.getElementById('nnPad').classList.contains('open'),
      focused:document.activeElement.tagName!=='INPUT',
      inView:(()=>{const r=document.getElementById('nnPad').getBoundingClientRect(); return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;})()}));
    ok(name+'：タップでパッドが開く・入力欄にフォーカスしない（キーボードが出ない）・画面内', r.open&&r.focused&&r.inView, r);
    /* ボタンの大きさ（44pt以上） */
    const bt=await p.evaluate(()=>{const b=document.querySelector('#nnPad .pgrid button');
      const r=b.getBoundingClientRect(); return {w:Math.round(r.width),h:Math.round(r.height)};});
    ok(name+'：ボタンが44pt以上', bt.w>=44&&bt.h>=44, bt);
    /* 2→5 と押して確定 → 数量25・金額が出る */
    for(const k of ['2','5']){ await p.evaluate(k=>{document.querySelector('#nnPad [data-k="'+k+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));},k); }
    await p.evaluate(()=>{document.querySelector('#nnPad [data-k="ok"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
    await p.waitForTimeout(400);
    const v=await p.evaluate(()=>({q:draft.lines[0].q, closed:!document.getElementById('nnPad').classList.contains('open'),
      total:draftTotal()}));
    ok(name+'：25 を入れて確定 → 反映・パッドが閉じる', v.q===25&&v.closed&&v.total>0, v);
    /* 「次へ」で次の行に移る */
    await p.tap('#content input.qty'); await p.waitForTimeout(250);
    await p.evaluate(()=>{['c','3'].forEach(k=>document.querySelector('#nnPad [data-k="'+k+'"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})));
      document.querySelector('#nnPad [data-k="next"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));});
    await p.waitForTimeout(400);
    const nx=await p.evaluate(()=>({q0:draft.lines[0].q, open:document.getElementById('nnPad').classList.contains('open'),
      tgt:document.querySelector('.nnpad-target')?[...document.querySelectorAll('#content input.qty')].indexOf(document.querySelector('.nnpad-target')):-1}));
    ok(name+'：「次へ」で確定して次の行へ', nx.q0===3&&nx.open&&nx.tgt===1, nx);
    if(name==='よこ') await p.screenshot({path:'out/chk_pad_land.png'});
    else await p.screenshot({path:'out/chk_pad_port.png'});
    ok(name+'：JSエラーなし', errs.length===0, errs);
    await p.close();
  }
  /* PCはパッドを出さない（従来どおり） */
  const pc=await b.newPage({viewport:{width:1600,height:900}});
  await pc.goto('http://localhost:8899/hacchu.html',{waitUntil:'load'}); await pc.waitForTimeout(1600);
  await pc.evaluate(()=>{ const g=GENBA.find(g=>g.st==='契約済'); startDraft(g.id); }); await pc.waitForTimeout(300);
  await pc.click('#content input.qty');
  ok('PC：パッドは出ない・普通に入力できる', await pc.evaluate(()=>!document.getElementById('nnPad')&&document.activeElement.classList.contains('qty')));
  console.log(R.join('\n'));
  await b.close();
})();
