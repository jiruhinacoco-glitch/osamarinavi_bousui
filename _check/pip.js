const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:900,height:600}});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ const x=[...document.querySelectorAll('button')].find(y=>y.textContent.includes('サンプル形状')); if(x)x.click(); });
  await p.waitForTimeout(700);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const poly=state.polys[1];
    return {holes:(poly.holes||[]).length,
      a:pointInPoly(poly.pts,23.97,8), b:pointInPoly(poly.pts,24.03,8),
      ia:insidePts(poly,23.97,8), ib:insidePts(poly,24.03,8),
      src:pointInPoly.toString().slice(0,340)};
  }),null,1));
  await b.close();
})();
