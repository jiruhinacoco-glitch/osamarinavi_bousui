const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1000,height:700}});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ const x=[...document.querySelectorAll('button')].find(y=>y.textContent.includes('サンプル形状')); if(x)x.click(); });
  await p.waitForTimeout(700);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const poly=state.polys[1], N=poly.pts.length, s=state.scaleM;
    return {scaleM:s, pts:poly.pts.map(q=>[q.x,q.y]),
      edges:poly.edges.map(e=>({h:e.h,w:e.w,k:e.k})),
      nrm:poly.pts.map((q,i)=>{ const n=ringNormal(poly,poly.pts,poly.pts[i],poly.pts[(i+1)%N]);
        return [+n.x.toFixed(2),+n.y.toFixed(2)]; })};
  }),null,1));
  await b.close();
})();
