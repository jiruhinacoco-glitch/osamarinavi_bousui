const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:900,height:600}});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(s=>{window.__STUB=s;}, '('+require('./stub3.js').toString()+')()');
  console.log(JSON.stringify(await p.evaluate(()=>{
    eval(window.__STUB);
    state.scaleM=1;
    const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:7},{x:0,y:7}];
    state.polys=[{name:'屋根①', lv:0, pts, holes:[], edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; show3dWari=true; dirty3d=true; build3D();
    const g=window.__zGroups[window.__zGroups.length-1];
    /* 立上り防水層＝PlaneGeometry */
    const faces=g.children.filter(c=>c.geometry&&c.geometry.kind==='pl'&&c.position._p)
      .map(c=>{ const [x,y,z]=c.position._p, L=c.geometry.w, H=c.geometry.h, ry=c.rotation.y||0;
        const th2=-ry, ux=Math.cos(th2), uz=Math.sin(th2);
        return {L:+L.toFixed(3), H:+H.toFixed(4), yTop:+(y+H/2).toFixed(4), yBot:+(y-H/2).toFixed(4),
          a:[+(x-L/2*ux).toFixed(3), +(z-L/2*uz).toFixed(3)],
          b:[+(x+L/2*ux).toFixed(3), +(z+L/2*uz).toFixed(3)]}; });
    /* 天端の板（ExtrudeGeometry・depth 0.012） */
    const caps=g.children.filter(c=>c.geometry&&c.geometry.kind==='ex'
        && Math.abs(c.geometry.depth-0.012)<1e-9)
      .map(c=>({yTop:+(c.position.y||0).toFixed(4),
        pts:c.geometry.shape.pts.map(v=>[+v.x.toFixed(3),+v.y.toFixed(3)])}));
    /* 隣どうしの端点が一致しているか */
    const near=(A,B)=>Math.hypot(A[0]-B[0],A[1]-B[1]);
    let gaps=[];
    faces.forEach((f,i)=>faces.forEach((h,j)=>{ if(i>=j)return;
      const d=Math.min(near(f.b,h.a), near(f.a,h.b));
      if(d<0.5) gaps.push({i,j,すきま:+d.toFixed(4)}); }));
    return {面の数:faces.length, 高さ:[...new Set(faces.map(f=>f.H))],
      上端:[...new Set(faces.map(f=>f.yTop))], 下端:[...new Set(faces.map(f=>f.yBot))],
      隣どうしのすきま:gaps, 天端の板:caps.slice(0,2)};
  }),null,1));
  await b.close();
})();
