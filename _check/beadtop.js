const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:900,height:600}});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200);
  await p.evaluate(s=>{window.__STUB=s;}, '('+require('./stub3.js').toString()+')()');
  console.log(JSON.stringify(await p.evaluate(()=>{
    eval(window.__STUB);
    state.scaleM=1;
    const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:7},{x:0,y:7}];
    state.polys=[{name:'屋根①', lv:0, pts, holes:[], edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; show3dWari=true; dirty3d=true; build3D();
    const g=window.__zGroups[window.__zGroups.length-1];
    const cy=g.children.filter(c=>c.geometry&&c.geometry.kind==='cyl'&&c.position._p);
    /* 天端の上端は 0.3+0.012=0.312。それより上に届くものを探す */
    const hi=cy.map(c=>{
      const [x,y,z]=c.position._p, gm=c.geometry;
      const vertical = !gm.alongX && gm.len>0.05 && !c.rotation.y && c.name!=='nnFlatSeam';
      /* 縦棒は y±len/2、横棒は y のまま */
      const top = (gm.alongX===false && c.rotation.y===0 && !c.name) ? y+gm.len/2 : y;
      return {name:c.name||'', x:+x.toFixed(3), y:+y.toFixed(3), z:+z.toFixed(3),
        len:+gm.len.toFixed(3), alongX:gm.alongX, ry:+(c.rotation.y||0).toFixed(2), top:+top.toFixed(3)};
    });
    return {n:cy.length, high:hi.filter(o=>o.top>0.315).slice(0,8),
      capBeads:hi.filter(o=>Math.abs(o.y-0.312)<0.001).slice(0,6),
      upright:hi.filter(o=>!o.alongX && o.ry===0 && o.name==='').slice(0,4)};
  }),null,1));
  await b.close();
})();
