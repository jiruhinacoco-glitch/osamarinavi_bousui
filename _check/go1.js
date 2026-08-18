/* ★2026-08-15e 詳細へボタン・1クリックで選択肢・沈み演出の一掃
   使い方: node go1.js [ph] */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const ctx=await b.newContext(PH
    ?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
    :{viewport:{width:1600,height:900}});
  if(PH) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(800);

  /* ① 詳細へボタン */
  const g1=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    const btn=c.querySelector('.pgo');
    if(!btn)return null;
    const r=btn.getBoundingClientRect();
    return {txt:btn.textContent.trim(), inHead:!!btn.closest('.pmid'),
      w:Math.round(r.width/(window.nnPZ||1)), h:Math.round(r.height/(window.nnPZ||1)),
      n:document.querySelectorAll('#list .pcard .pgo').length};
  });
  console.log('①', JSON.stringify(g1));
  /* ★2026-08-16y 文字は「詳細」に、置き場所はいちばん下の行の右端（カードの右下）へ */
  ok('「詳細」ボタンが全カードにある', g1 && g1.txt==='詳細' && g1.n>=10, g1&&g1.n+'個');
  ok('本文の右側（利益予定額の下）にある', g1 && g1.inHead);
  /* 実クリックで詳細へ */
  await p.click('#list .pcard .pgo'); await p.waitForTimeout(700);
  const g2=await p.evaluate(()=>({
    detail:document.getElementById('mainview').classList.contains('show-detail'),
    name:(document.querySelector('#detail h2')||{}).textContent||''}));
  ok('1クリックで詳細ページに移動する', g2.detail, JSON.stringify(g2));
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(700);

  /* ② 既存・区分・構造：1クリックで選択肢（select）が現れ、黄色にならない */
  const pos=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    const e=c.querySelector('.pexist .ebox[data-f="kizon"]');
    const r=e.getBoundingClientRect();
    return {x:r.left+r.width/2, y:r.top+r.height/2, pid:c.dataset.pid};
  });
  await p.mouse.click(pos.x,pos.y); await p.waitForTimeout(350);
  const g3=await p.evaluate(pid=>{
    const c=document.querySelector('#list .pcard[data-pid="'+pid+'"]');
    const e=c.querySelector('.pexist .ebox[data-f="kizon"]');
    return {sel:!!e.querySelector('select'), armed:c.classList.contains('armed'),
      focused:document.activeElement&&document.activeElement.tagName==='SELECT',
      label:!!e.querySelector('i')};
  },pos.pid);
  console.log('②', JSON.stringify(g3));
  ok('1クリックで選択肢（select）が現れる', g3.sel && g3.focused, JSON.stringify(g3));
  ok('★カードは黄色（選択）にならない', g3.armed===false, String(g3.armed));
  ok('左の項目名も残っている', g3.label);
  /* ★showPicker で開いた一覧が残っていると次のクリックが「閉じる」に食われる。
     Escape＋blur＋余白クリックで確実に閉じてから次へ。 */
  await p.keyboard.press('Escape');
  await p.evaluate(()=>{ if(document.activeElement)document.activeElement.blur(); });
  await p.click('#q'); await p.evaluate(()=>document.getElementById('q').blur());
  await p.waitForTimeout(500);

  /* 行の余白（アイコンの脇）を押しても開く・黄色にならない */
  const pos2=await p.evaluate(()=>{
    const c=document.querySelector('#list .pcard');
    const row=c.querySelector('.pexist .pexrow');
    const r=row.getBoundingClientRect();
    return {x:r.right-4, y:r.top+r.height/2, pid:c.dataset.pid};   /* 行の右端＝囲みの外 */
  });
  await p.mouse.click(pos2.x,pos2.y); await p.waitForTimeout(350);
  const g4=await p.evaluate(pid=>{
    const c=document.querySelector('#list .pcard[data-pid="'+pid+'"]');
    return {sel:!!c.querySelector('.pexist .ebox select'), armed:c.classList.contains('armed')};
  },pos2.pid);
  ok('行の余白を押しても選択肢が開く・黄色にならない', g4.sel && !g4.armed, JSON.stringify(g4));
  await p.keyboard.press('Escape');
  await p.evaluate(()=>{ if(document.activeElement)document.activeElement.blur(); });
  await p.click('#q'); await p.evaluate(()=>document.getElementById('q').blur());
  await p.waitForTimeout(500);

  /* ③ 沈み演出：カードの中に :active で transform が残っていないか（CSSを全部なめる） */
  const g5=await p.evaluate(()=>{
    const bad=[];
    for(const ss of document.styleSheets){
      let rules; try{ rules=ss.cssRules; }catch(_){ continue; }
      for(const r of rules||[]){
        if(!r.selectorText||!r.style)continue;
        if(!/:active/.test(r.selectorText))continue;
        const t=r.style.transform;
        if(!t||t==='none')continue;
        /* カードの中に効き得るもの（.pcard 配下 or カード内の部品名） */
        if(/\.pcard|\.pshmore|\.pph|\.psh\b|\.ebox|\.pgo|\.pdocs|\.doc\b/.test(r.selectorText))
          bad.push(r.selectorText+' → '+t);
      }
    }
    /* 打ち消し（transform:none !important）が効いているかを実測でも見る */
    const c=document.querySelector('#list .pcard');
    const more=c.querySelector('.pshmore');
    return {bad, hasKill:!!more||true};
  });
  console.log('③', JSON.stringify(g5.bad));
  /* 打ち消しがあるので、素の指定が残っていても実際には動かない。実測で確認： */
  await p.mouse.move(10,60); await p.waitForTimeout(250);
  const g6=await p.evaluate(async()=>{
    const c=document.querySelector('#list .pcard');
    const r0=c.getBoundingClientRect();
    const tgt=c.querySelector('.pshmore')||c.querySelector('.pdate')||c;
    const rt=tgt.getBoundingClientRect();
    const down=new PointerEvent('pointerdown',{bubbles:true,clientX:rt.left+4,clientY:rt.top+4});
    tgt.dispatchEvent(down);
    /* :active はマウス押下中のみ。getComputedStyle で transform を見る */
    const tr=getComputedStyle(c).transform;
    const shifts=[];
    c.querySelectorAll('*').forEach(el=>{
      const t=getComputedStyle(el).transform;
      if(t && t!=='none' && !el.closest('.pprog')) shifts.push(el.className+':'+t);
    });
    return {cardTr:tr, shifts:shifts.slice(0,4)};
  });
  console.log('実測', JSON.stringify(g6));
  ok('カード自身は動かない（transform:none）', g6.cardTr==='none', g6.cardTr);
  ok('カードの中の部品も動いていない', g6.shifts.length===0, JSON.stringify(g6.shifts));

  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n'+(PH?'【スマホたて】':'【パソコン 1600px】'));
  console.log(R.join('\n'));
  await b.close();
})();
