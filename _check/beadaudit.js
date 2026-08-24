const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1000,height:700}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1300); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(s=>{window.__STUB=s;}, '('+require('./stub3.js').toString()+')()');
  const r=await p.evaluate(()=>{
    eval(window.__STUB);
    state.scaleM=1;
    const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:7},{x:0,y:7}];
    state.polys=[{name:'屋根①', lv:0, pts, holes:[], edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; show3dWari=true; dirty3d=true; build3D();
    const g=window.__zMain();
    /* ★2026-08-12p 天端の内側に面取り（CH=20mm）が入ったので、
       縦の継目は面取りの手前（hh−CH）で止まり、そこから斜めの継目が天端へ渡る。
       天端の横の継目も、内側の端が th−CH になる。 */
    const th=0.25, hh=0.30, CH=0.02, capY=hh+0.012;
    const cy=g.children.filter(c=>c.geometry&&c.geometry.kind==='cyl'&&c.position._p);
    const out={n:cy.length, cap:[], vert:[], bad:[]};
    /* 屋根の外形（0..10 × 0..7）。外の面からの距離 d を出す */
    const distFromEdge=(x,z)=>Math.min(x, 10-x, z, 7-z);   /* 正＝内側、負＝外 */
    cy.forEach(c=>{
      const [x,y,z]=c.position._p, gm=c.geometry, L=gm.len, ry=c.rotation.y||0;
      const isCap = Math.abs(y-capY)<0.002;
      const isVert = !gm.alongX && ry===0 && c.name!=='nnChamBead' && c.name!=='nnFlatSeam';
      if(isCap){
        const th2=-ry, ux=Math.cos(th2), uz=Math.sin(th2);
        const e=gm.alongX?[[x-L/2*ux,z-L/2*uz],[x+L/2*ux,z+L/2*uz]]:[[x,z-L/2],[x,z+L/2]];
        const ds=e.map(([a,c2])=>+distFromEdge(a,c2).toFixed(4));
        out.cap.push({y:+y.toFixed(3), L:+L.toFixed(3), d:ds});
        if(ds.some(v=>v<-0.001)) out.bad.push({why:'天端の継目が外へ出ている', y:+y.toFixed(3), d:ds});
        if(ds.some(v=>v>th+0.01)) out.bad.push({why:'天端の継目が内へ行き過ぎ', d:ds});
      } else if(isVert){
        const top=+(y+L/2).toFixed(4), bot=+(y-L/2).toFixed(4);
        out.vert.push({top, bot, L:+L.toFixed(3)});
        if(Math.abs(top-(hh-CH))>0.002) out.bad.push({why:'縦の継目の上端が面取りの下に来ない', top, 想定:+(hh-CH).toFixed(3)});
      }
    });
    /* 縦と天端の高さがそろっているか */
    out.cham=g.children.filter(c=>c.name==='nnChamBead').length;   /* 面取りを渡る継目 */
    out.capY=+capY.toFixed(4);
    out.capYs=[...new Set(out.cap.map(o=>o.y))];
    out.vTops=[...new Set(out.vert.map(o=>o.top))];
    return out;
  });
  console.log('継目の総数', r.n, '／天端', r.cap.length, '／縦', r.vert.length);
  console.log('天端の高さ', JSON.stringify(r.capYs), '  縦の上端', JSON.stringify(r.vTops), '  想定', r.capY);
  console.log('天端の継目の位置（外の面からの距離m・両端）', JSON.stringify(r.cap.slice(0,6).map(o=>o.d)));
  console.log('面取りを渡る継目', r.cham, '本');
  console.log('★問題', r.bad.length, JSON.stringify(r.bad.slice(0,6)));
  console.log('errs', errs.join('|')||'none');
  await b.close();
})();
