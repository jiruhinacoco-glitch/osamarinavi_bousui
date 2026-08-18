const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [n,vp] of [['pc',{viewport:{width:2000,height:1010}}],
                       ['land',{viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true}]]){
    const p=await b.newPage(vp);
    if(n!=='pc')await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
    await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2000);
    await p.evaluate(()=>showView("list")); await p.waitForTimeout(700);
    await p.evaluate(()=>{ listFil['kizon'].add('不明'); buildChips(); render(); });
    await p.waitForTimeout(900);
    console.log(n, JSON.stringify(await p.evaluate(()=>{
      const Z=window.nnPZ||1;
      const on=document.querySelector('#toolbar .stchip.on'), off=document.querySelector('#toolbar .stchip:not(.on)');
      const h=e=>Math.round(e.getBoundingClientRect().height/Z*10)/10;
      const lh=document.querySelector('.listhead'), tb=document.getElementById('toolbar');
      const card=document.querySelector('#list .pcard');
      return {chipOn:h(on), chipOff:h(off),
        lhH:lh?h(lh):null,
        gapAbove: lh? Math.round((lh.getBoundingClientRect().top-tb.getBoundingClientRect().bottom)/Z):null,
        gapBelow: lh&&card? Math.round((card.getBoundingClientRect().top-lh.getBoundingClientRect().bottom)/Z):null};
    })));
    await p.close();
  }
  await b.close();
})();
