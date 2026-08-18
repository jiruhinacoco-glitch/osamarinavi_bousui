const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [n,vp,f] of [['pc',{viewport:{width:2000,height:1010}},'kirokucho_demo.html'],
                         ['land',{viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true},'_land.html']]){
    const p=await b.newPage(vp);
    if(n!=='pc')await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8899/'+f); await p.waitForTimeout(2200);
    await p.evaluate(()=>showView('list')); await p.waitForTimeout(1200);
    const c=await p.$('#list .pcard'); await c.screenshot({path:'s17_'+n+'.png'});
    const m=await p.evaluate(()=>{
      const Z=window.nnPZ||1, c=document.querySelector('#list .pcard');
      const g=e=>e?Math.round(e.getBoundingClientRect().height/Z):null;
      const gw=e=>e?Math.round(e.getBoundingClientRect().width/Z):null;
      return {card:g(c), pcol:g(c.querySelector('.pcol')), pbd:g(c.querySelector('.pbd')),
        gapBottom: Math.round((c.getBoundingClientRect().bottom-c.querySelector('.rbot').getBoundingClientRect().bottom)/Z),
        pgoW:gw(c.querySelector('.pgo')), pgoH:g(c.querySelector('.pgo')),
        progW:gw(c.querySelector('.rprog .pprog'))};
    });
    console.log(n, JSON.stringify(m), 'errs:', errs.join('/')||'none');
    await p.close();
  }
  await b.close();
})();
