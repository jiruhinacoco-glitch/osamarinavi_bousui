/* 現場一覧カード：色枠・写真・角なし・タップ動作（PC/たて/よこ） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let ng=0; const ok=(c,t,v='')=>{ if(!c) ng++; console.log((c?'○':'★NG ')+' '+t+'  '+v); };
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const [mode,vp] of [['pc',{width:1600,height:900}],['phone',{width:393,height:852}],['land',{width:852,height:393}]]){
    console.log('\n===== '+mode+' =====');
    const ctx=await b.newContext({viewport:vp, deviceScaleFactor:mode==='pc'?1:2, isMobile:mode!=='pc', hasTouch:mode!=='pc'});
    const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    if(mode!=='pc') await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    await p.goto('file:///home/user/osamarinavi_bousui/kirokucho_demo.html'); await p.waitForTimeout(2000);
    await p.evaluate(()=>showView('list')); await p.waitForTimeout(1400);
    const r=await p.evaluate(()=>{
      const Z=window.nnPZ||1;
      const cards=[...document.querySelectorAll('#list .pcard')];
      const seen={}; let badRadius=0, badImg=0, noPhoto=0, over=0;
      const colors={};
      cards.forEach(c=>{
        const cs=getComputedStyle(c);
        if(parseFloat(cs.borderTopLeftRadius)>0.5) badRadius++;
        const st=[...c.classList].find(x=>x.startsWith('st-'));
        colors[st]=cs.borderTopColor;
        seen[st]=(seen[st]||0)+1;
        const im=c.querySelector('.pph img');
        if(!im) noPhoto++;
        /* ★2026-08-14a 画面に映っていないカードは後回しにする（content-visibility:auto）ので、
           見えていないカードの写真はまだ読み込まれていなくて正しい。見えている分だけ見る。 */
        else if(!(im.naturalWidth>0) && (()=>{        /* 画面に映っているカードだけ見る */
          const lb=(document.getElementById('list')||document.body).getBoundingClientRect();
          const r=c.getBoundingClientRect();
          return r.bottom>lb.top-40 && r.top<lb.bottom+40;
        })()) badImg++;
        if(c.getBoundingClientRect().right/Z > innerWidth/Z+1) over++;
      });
      const dh=document.documentElement;
      return {n:cards.length, badRadius, badImg, noPhoto, over, seen, colors,
        scrollX: Math.round(dh.scrollWidth-dh.clientWidth),
        firstH: Math.round(cards[0].getBoundingClientRect().height/Z)};
    });
    ok(r.n===100,'カードは100件', r.n);
    ok(r.badRadius===0,'角の丸みなし', r.badRadius+'件に丸み');
    ok(r.noPhoto===0 && r.badImg===0,'写真が全カードで読めている', 'なし'+r.noPhoto+' 読めず'+r.badImg);
    ok(r.over===0 && r.scrollX<=0,'横はみ出しなし', 'over '+r.over+' scrollX '+r.scrollX);
    const want={ 'st-kou':'rgb(255, 138, 30)','st-mit':'rgb(47, 157, 255)','st-kan':'rgb(33, 165, 63)',
      'st-hikiai':'rgb(240, 196, 25)','st-keiyaku':'rgb(216, 67, 67)','st-chosa':'rgb(47, 157, 255)'};
    for(const k in want) ok(r.colors[k]===want[k], k+' の枠色', r.colors[k]);
    console.log('   状態の内訳:', JSON.stringify(r.seen), ' 1枚目の高さ', r.firstH+'px');
    /* 2回タップで詳細へ（1回目=黄色選択） */
    /* ★2026-08-13k 写真は「写真の操作」専用になり、カードの選択・移動には使わない。
       中立な場所＝日付の文字をタップして確かめる。 */
    /* ★2026-08-17a タップ＝選ぶだけ。詳細へは「詳細」ボタンから（本人の指示） */
    const el=await p.$('#list .pcard .pdate');
    await el.click(); await p.waitForTimeout(300);
    const seln=await p.evaluate(()=>document.querySelectorAll('#list .pcard.sel').length);
    await p.click('#list .pcard .pgo'); await p.waitForTimeout(700);
    const detail=await p.evaluate(m=>{
      return m!=='pc'? !!document.querySelector('#mainview.show-detail, #detail .dhead h2')
                     : !!document.querySelector('#detail .dhead h2');
    }, mode);
    ok(seln===1,'タップで選ばれる（黄色）', seln);
    ok(detail,'「詳細」ボタンで詳細が開く');
    ok(errs.length===0,'JSエラーなし', errs.join(' | '));
    await p.screenshot({path:'pwlist_'+mode+'.png'});
    await ctx.close();
  }
  await b.close(); console.log(ng?'\n★NG '+ng+'件':'\nすべて○');
})();
