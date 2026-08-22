const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [nm,vw,vh] of [['たて',393,852],['よこ',852,393]]){
    const p=await b.newPage({viewport:{width:vw,height:vh},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1800); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
    await p.evaluate(()=>loadSample()); await p.waitForTimeout(500);
    await p.evaluate(()=>{ document.getElementById('side').classList.add('open'); });
    await p.waitForTimeout(400);
    const d=await p.evaluate(()=>{
      const box=document.getElementById('nnPartsBox'); if(!box) return null;
      box.scrollIntoView({block:'center'});
      const r=box.getBoundingClientRect(), side=document.getElementById('side').getBoundingClientRect();
      const btn=box.querySelector('button[data-a="place"]').getBoundingClientRect();
      return {inSide:r.left>=side.left-1 && r.right<=side.right+1,
        ov:document.documentElement.scrollWidth-innerWidth, btnH:Math.round(btn.height)};
    });
    ok(nm+'：役物パネルが引き出しに収まる', d && d.inSide, JSON.stringify(d));
    ok(nm+'：横にはみ出さない', d && d.ov<=1, String(d&&d.ov));
    ok(nm+'：ボタンが押せる大きさ', d && d.btnH>=24, (d&&d.btnH)+'px');
    /* 置く→引き出しが閉じる */
    await p.evaluate(()=>document.querySelector('#nnPartsBox button[data-a="place"][data-id="p2"]').click());
    await p.waitForTimeout(300);
    ok(nm+'：「置く」で引き出しが閉じる', await p.evaluate(()=>!document.getElementById('side').classList.contains('open')));
    /* 操作バーがナビと重ならないか（置いたあと） */
    const cvb=await (await p.$('#cv')).boundingBox();
    await p.touchscreen.tap(cvb.x+cvb.width*0.5, cvb.y+cvb.height*0.45);
    await p.waitForTimeout(400);
    const bb=await p.evaluate(()=>{ const e=document.getElementById('nnPartBar');
      if(!e||!e.classList.contains('on'))return null; const r=e.getBoundingClientRect();
      return {w:Math.round(r.width), left:Math.round(r.left), right:Math.round(r.right), bottom:Math.round(r.bottom)}; });
    ok(nm+'：操作バーが画面内', bb && bb.left>=0 && bb.right<=vw+1 && bb.bottom<=vh+1, JSON.stringify(bb));
    ok(nm+'：JSエラーなし', errs.length===0, errs[0]||'');
    await p.close();
  }
  console.log(R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'★ NG あり':'すべて○');
  await b.close();
})();
