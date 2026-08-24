const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1200,height:820}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(s=>{window.__STUB=s;}, '('+require('./stub3.js').toString()+')()');
  await p.evaluate(()=>{ const x=[...document.querySelectorAll('button')].find(y=>y.textContent.includes('サンプル形状')); if(x)x.click(); });
  await p.waitForTimeout(700);
  const r=await p.evaluate(()=>{
    eval(window.__STUB);
    show3dWari=true; dirty3d=true; build3D();
    const g=window.__zMain();
    const s=state.scaleM;
    const inPts=(pts,x,z)=>{ let ins=false;
      for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        if(((pts[i].y>z)!==(pts[j].y>z)) &&
           (x<(pts[j].x-pts[i].x)*(z-pts[i].y)/(pts[j].y-pts[i].y)+pts[i].x)) ins=!ins; }
      return ins; };
    /* 「立上りが貼りかかる線」の内側の輪郭 */
    const insets=state.polys.map(poly=>({lv:poly.lv||0,
      o:nnInsetOutline(poly, poly.pts, poly.edges, s, 0.12),
      h:(poly.holes||[]).map(hh=>nnInsetOutline(poly, hh.pts, hh.edges, s, 0.12))}));
    const inInset=(x,z,y)=>insets.some(t=>Math.abs((t.lv+0.016)-y)<0.005
      && inPts(t.o,x,z) && !t.h.some(hh=>inPts(hh,x,z)));
    const beads=g.children.filter(c=>c.name==='nnFlatSeam'&&c.position._p);
    let out=0; const bad=[];
    beads.forEach(c=>{ const gm=c.geometry,[cx,cy,cz]=c.position._p,L=gm.len;
      /* ★端はちょうど境界線の上に来る。境界そのものは内外の判定がぶれるので、
           2mmだけ内側に寄せた点で見る（2mm以上はみ出していれば★NGになる）。 */
      const q=L/2-0.002;
      const e=gm.alongX?[[cx-q,cz],[cx+q,cz]]:[[cx,cz-q],[cx,cz+q]];
      e.forEach(([x,z])=>{ if(!inInset(x,z,cy)){ out++;
        if(bad.length<6) bad.push({x:+x.toFixed(2),z:+z.toFixed(2),y:+cy.toFixed(2),L:+L.toFixed(2),ax:gm.alongX}); } }); });
    return {beads:beads.length, out, bad,
      lv:insets.map(t=>({lv:t.lv, o:t.o.map(q=>[+q.x.toFixed(2),+q.y.toFixed(2)])}))};
  });
  console.log(JSON.stringify({bad:r.bad, lv:r.lv},null,1).slice(0,1400));
  ok('平場の継目は「立上りが貼りかかる線」の内側で止まる', r.out===0, '継目'+r.beads+'本／はみ出し '+r.out+'点');
  ok('JSエラーなし', errs.length===0, errs[0]||'');
  console.log(R.join('\n'));
  await b.close();
})();
