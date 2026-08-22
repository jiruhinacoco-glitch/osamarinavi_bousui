/* 修正前の描き方（帯の幅で決め打ち）と比べて、はみ出しが本当に消えたかを数値で見る */
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await (await browser.newContext({viewport:{width:1280,height:860}})).newPage();
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1200); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  /* ★L字形の部位を作る（凸凹した形＝帯が屋根の外に出る形） */
  await p.evaluate(()=>{
    state.polys=[{name:'L字の屋根', lv:0,
      pts:[{x:0,y:0},{x:40,y:0},{x:40,y:12},{x:16,y:12},{x:16,y:32},{x:0,y:32}],
      edges:Array.from({length:6},()=>({h:300,w:250,k:'para'})), holes:[]}];
    state.active=0; saveState(); draw();
  });
  await p.waitForTimeout(500);
  const r = await p.evaluate(()=>{
    const s=state.scaleM, sp=spec();
    const inPoly=(poly,x,z)=>{
      const pts=poly.pts.map(q=>({x:q.x*s,y:q.y*s}));
      let inside=false;
      for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        if(((pts[i].y>z)!==(pts[j].y>z)) && (x < (pts[j].x-pts[i].x)*(z-pts[i].y)/(pts[j].y-pts[i].y)+pts[i].x)) inside=!inside;
      }
      if(inside)return true;
      for(let i=0,j=pts.length-1;i<pts.length;j=i++){
        const dx=pts[j].x-pts[i].x, dy=pts[j].y-pts[i].y, L2=dx*dx+dy*dy||1;
        let t=((x-pts[i].x)*dx+(z-pts[i].y)*dy)/L2; t=Math.max(0,Math.min(1,t));
        if(Math.hypot(x-(pts[i].x+dx*t), z-(pts[i].y+dy*t))<0.06)return true;
      }
      return false;
    };
    let oldOut=0, oldN=0, newOut=0, newN=0;
    state.polys.forEach(poly=>{
      const ptsM=poly.pts.map(q=>({x:q.x*s,y:q.y*s}));
      const holesM=(poly.holes||[]).map(hh=>hh.pts.map(q=>({x:q.x*s,y:q.y*s})));
      const lay=wari(ptsM, holesM, sp.sheetW, state.lapMm/1000, state.endLapMm/1000, sp.rollLen, dirOf(poly), state.chidori);
      const HDIR=dirOf(poly)==='h';
      const T3=q=>HDIR?{x:q.y,y:q.x}:q;
      lay.bands.forEach(b=>{
        b.segs.forEach(sg=>sg.pieces.forEach((pc,pi)=>{
          if(pi===0)return;
          /* 旧：帯の幅ぶんの棒 */
          const bw=Math.min(b.hi-b.lo, sp.sheetW);
          const oldEnds=HDIR?[[pc.s,b.lo],[pc.s,b.lo+bw]]:[[b.lo,pc.s],[b.lo+bw,pc.s]];
          oldEnds.forEach(([x,z])=>{ oldN++; if(!inPoly(poly,x,z))oldOut++; });
          /* 新：屋根の中の区間だけ */
          const cross=scanSegsH(ptsM.map(T3), holesM.map(hh=>hh.map(T3)), pc.s+1e-5);
          cross.forEach(cs=>{
            const lo=Math.max(cs[0],b.lo), hi=Math.min(cs[1],b.hi);
            if(hi-lo<0.05)return;
            const ends=HDIR?[[pc.s,lo],[pc.s,hi]]:[[lo,pc.s],[hi,pc.s]];
            ends.forEach(([x,z])=>{ newN++; if(!inPoly(poly,x,z))newOut++; });
          });
        }));
      });
    });
    return {oldN,oldOut,newN,newOut};
  });
  console.log('修正前：継目の端点'+r.oldN+'個中 '+r.oldOut+'個が屋根の外（はみ出し）');
  console.log('修正後：継目の端点'+r.newN+'個中 '+r.newOut+'個が屋根の外');
  console.log(r.oldOut>0 && r.newOut===0 ? '○ はみ出しが解消（修正前は実際にはみ出していた）' : '（要確認）');
  await browser.close();
})();
