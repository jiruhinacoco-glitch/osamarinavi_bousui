const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
  const d=await p.evaluate(()=>{
    const o=[];
    document.querySelectorAll('.httl').forEach(e=>{
      const r=e.getBoundingClientRect(), par=e.closest('.dpanel').getBoundingClientRect(), im=e.querySelector('img.hpic');
      o.push({t:e.textContent.trim().slice(0,10), h:Math.round(r.height), lines:r.height>parseFloat(getComputedStyle(e).fontSize)*1.8?'★2行':'1行',
        img:im?Math.round(im.getBoundingClientRect().width)+'x'+Math.round(im.getBoundingClientRect().height):'—',
        inPanel:r.left>=par.left-1&&r.right<=par.right+1});
    });
    return {o, ov:document.documentElement.scrollWidth-innerWidth};
  });
  console.table(d.o); console.log('横はみ出し',d.ov,'JSエラー',errs);
  const el=(await p.$$('.httl'))[2]; await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const r=await el.boundingBox();
  await p.screenshot({path:'hpic_mo.png',clip:{x:0,y:Math.max(0,r.y-14),width:393,height:r.height+30}});
  await b.close();
})();
