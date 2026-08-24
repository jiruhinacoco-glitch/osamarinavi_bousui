const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1200,height:820}});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(s=>{window.__STUB=s;}, '('+require('./stub3.js').toString()+')()');
  await p.evaluate(()=>{ const x=[...document.querySelectorAll('button')].find(y=>y.textContent.includes('サンプル形状')); if(x)x.click(); });
  await p.waitForTimeout(700);
  const r=await p.evaluate(()=>{
    eval(window.__STUB);
    show3dWari=true; dirty3d=true; build3D();
    const g=window.__zGroups[window.__zGroups.length-1];
    const s=state.scaleM;
    const flatY=state.polys.map(pp=>(pp.lv||0)+0.016);
    const seams=g.children.filter(c=>c.geometry&&c.geometry.kind==='cyl'
      && flatY.some(yy=>Math.abs(c.position._p[1]-yy)<0.005));
    const inAny=(x,z)=>state.polys.some(poly=>{
      const pts=poly.pts.map(q=>({x:q.x*s,y:q.y*s}));
      let inside=false;
      for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        if(((pts[i].y>z)!==(pts[j].y>z)) &&
           (x < (pts[j].x-pts[i].x)*(z-pts[i].y)/(pts[j].y-pts[i].y)+pts[i].x)) inside=!inside; }
      if(inside)return true;
      for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        const dx=pts[j].x-pts[i].x, dy=pts[j].y-pts[i].y, L2=dx*dx+dy*dy||1;
        let t=((x-pts[i].x)*dx+(z-pts[i].y)*dy)/L2; t=Math.max(0,Math.min(1,t));
        if(Math.hypot(x-(pts[i].x+dx*t), z-(pts[i].y+dy*t))<0.06)return true; }
      return false;});
    const bad=[];
    seams.forEach(c=>{
      const gm=c.geometry,[cx,cy,cz]=c.position._p,L=gm.len;
      const ends=gm.alongX?[[cx-L/2,cz],[cx+L/2,cz]]:[[cx,cz-L/2],[cx,cz+L/2]];
      ends.forEach(([x,z])=>{ if(!inAny(x,z)) bad.push({x:+x.toFixed(3),z:+z.toFixed(3),y:+cy.toFixed(3),L:+L.toFixed(3),alongX:gm.alongX}); });
    });
    return {n:seams.length, bad, polys:state.polys.map(pp=>({lv:pp.lv,n:pp.pts.length,
      bb:[Math.min(...pp.pts.map(q=>q.x*s)),Math.min(...pp.pts.map(q=>q.y*s)),
          Math.max(...pp.pts.map(q=>q.x*s)),Math.max(...pp.pts.map(q=>q.y*s))].map(v=>+v.toFixed(2))}))};
  });
  console.log(JSON.stringify(r,null,1));
  await b.close();
})();
