const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1000,height:900},deviceScaleFactor:4});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
  const d=await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('.httl').forEach(e=>{
      const im=e.querySelector('img.hpic'), r=e.getBoundingClientRect();
      out.push({t:e.textContent.trim().slice(0,12), img:im?im.getAttribute('src').split('/').pop():'—',
        ok:im?(im.naturalWidth>0):null,
        iw:im?Math.round(im.getBoundingClientRect().width):0,
        ih:im?Math.round(im.getBoundingClientRect().height):0,
        pad:parseFloat(getComputedStyle(e).paddingLeft), col:getComputedStyle(e).color});
    });
    return {out, ov:document.documentElement.scrollWidth-innerWidth};
  });
  console.table(d.out); console.log('横はみ出し',d.ov,'JSエラー',errs);
  // 3つの見出しを撮る
  const idx=[0,1,2];
  for(const i of idx){
    const el=(await p.$$('.httl'))[i]; await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
    const r=await el.boundingBox();
    await p.screenshot({path:'hpic'+i+'.png',clip:{x:Math.max(0,r.x-16),y:Math.max(0,r.y-18),width:330,height:r.height+36}});
  }
  await b.close();
})();
