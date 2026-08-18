const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1200,height:820}});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200);
  await p.evaluate(s=>{window.__STUB=s;}, '('+require('./stub3.js').toString()+')()');
  await p.evaluate(()=>{ const x=[...document.querySelectorAll('button')].find(y=>y.textContent.includes('サンプル形状')); if(x)x.click(); });
  await p.waitForTimeout(700);
  const r=await p.evaluate(()=>{
    eval(window.__STUB);
    show3dWari=true; dirty3d=true; build3D();
    const g=window.__zGroups[window.__zGroups.length-1];
    const s=state.scaleM;
    const inPoly=(x,z)=>state.polys.some(poly=>{
      const pts=poly.pts.map(q=>({x:q.x*s,y:q.y*s}));
      let ins=false;
      for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        if(((pts[i].y>z)!==(pts[j].y>z)) &&
           (x<(pts[j].x-pts[i].x)*(z-pts[i].y)/(pts[j].y-pts[i].y)+pts[i].x)) ins=!ins; }
      return ins;});
    /* 立上り防水層＝PlaneGeometry の面 */
    const faces=g.children.filter(c=>c.geometry&&c.geometry.kind==='pl');
    const out=faces.filter(c=>c.position._p&&!inPoly(c.position._p[0],c.position._p[2]));
    /* 天端の縦の継目（r1→r2）は 0.02〜th の範囲＝屋根の外にある */
    const cyl=g.children.filter(c=>c.geometry&&c.geometry.kind==='cyl'&&c.position._p);
    const cylOut=cyl.filter(c=>!inPoly(c.position._p[0],c.position._p[2]));
    return {faces:faces.length, facesOut:out.length,
      outSample:out.slice(0,4).map(c=>c.position._p.map(v=>+v.toFixed(2))),
      cyl:cyl.length, cylOut:cylOut.length};
  });
  console.log(JSON.stringify(r,null,1));
  await b.close();
})();
