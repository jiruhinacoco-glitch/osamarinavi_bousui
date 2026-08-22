/* ★2026-08-13m 「そろえる線」（始点・既存の角の真上/真下/真横）に止まるか
   使い方: node align1.js            （パソコン）
           node align1.js ph         （スマホたて＝赤い照準の道すじ） */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PH=process.argv[2]==='ph';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));

(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext(PH
    ?{viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true}
    :{viewport:{width:1280,height:800}});
  if(PH) await ctx.addInitScript(()=>{ Object.defineProperty(screen,'width',{get:()=>393}); Object.defineProperty(screen,'height',{get:()=>852}); });
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.waitForTimeout(1400);

  /* ① 始点の真下（x を始点にそろえる）＝閉じる辺が垂直になる */
  const v=await p.evaluate(()=>{
    tool='draw'; state.polys=[]; state.active=-1;
    /* 始点(0,0) → 右へ8 → 下へ4 …と歩いて、最後に始点の真下あたりを狙う */
    drawPts=[{x:0,y:0},{x:8,y:0},{x:8,y:4},{x:3.37,y:4.13}];
    const before=(function(){ /* そろえが無かったころの値＝角度長さだけの丸め */
      const prev=drawPts[3], dx=0.09-prev.x, dy=4.02-prev.y;
      const deg=Math.round(Math.atan2(dy,dx)*180/Math.PI/5)*5, rad=deg*Math.PI/180;
      const st=nnLenStepM()/state.scaleM, L=Math.round(Math.hypot(dx,dy)/st)*st;
      return {x:prev.x+Math.cos(rad)*L, y:prev.y+Math.sin(rad)*L};
    })();
    const g=nnSnapPt(0.09, 4.02);          /* 始点(x=0)から少しずれた狙い */
    return {g, before, hit:nnAlignHit&&{axis:nnAlignHit.lines.map(l=>l.axis).join(""), val:(nnAlignHit.lines.find(l=>l.axis==="x")||{}).val, t:(nnAlignHit.lines.find(l=>l.axis==="x")||{}).t}, cell:cellPx};
  });
  console.log('①', JSON.stringify(v));
  ok('始点の真下にそろう（x=0 ぴったり）', Math.abs(v.g.x-0)<1e-9, JSON.stringify(v.g));
  ok('そろえた相手は始点', v.hit && v.hit.axis.indexOf('x')>=0 && Math.abs(v.hit.val)<1e-9, JSON.stringify(v.hit));
  ok('そろえが無いとズレていた（改善の証拠）', Math.abs(v.before.x-0)>0.02, 'before x='+v.before.x.toFixed(3));

  /* ② 真下へ下ろす（線とほぼ平行）ときも、始点の x に載る */
  const par=await p.evaluate(()=>{
    tool='draw'; state.polys=[];
    drawPts=[{x:0,y:0},{x:8,y:0},{x:8,y:4},{x:0.07,y:4.0}];   /* 直前の点が始点から7cmズレている */
    const g=nnSnapPt(0.05, 7.9);           /* まっすぐ下へ */
    return {g, hit:nnAlignHit&&nnAlignHit.lines.map(l=>l.axis).join("")};
  });
  console.log('②', JSON.stringify(par));
  ok('真下へ下ろしても始点の x に載る', Math.abs(par.g.x-0)<1e-9, JSON.stringify(par.g));

  /* ③ 始点の真横（y をそろえる） */
  const h=await p.evaluate(()=>{
    tool='draw'; state.polys=[];
    drawPts=[{x:0,y:0},{x:0,y:5},{x:6,y:5}];
    const g=nnSnapPt(6.02, 0.06);
    return {g, hit:nnAlignHit&&nnAlignHit.lines.map(l=>l.axis).join("")};
  });
  console.log('③', JSON.stringify(h));
  ok('始点の真横にそろう（y=0 ぴったり）', Math.abs(h.g.y-0)<1e-9, JSON.stringify(h.g));
  ok('そろえた向きは よこ', h.hit==='y', String(h.hit));

  /* ④ 既存の部位の角にもそろう */
  const ex=await p.evaluate(()=>{
    tool='draw';
    state.polys=[{name:'屋根①',lv:0,pts:[{x:-6,y:0},{x:-2,y:0},{x:-2,y:3},{x:-6,y:3}],
                  edges:[0,0,0,0].map(()=>({h:300,w:250,k:'para'}))}];
    drawPts=[{x:2,y:6},{x:6,y:6}];
    const g=nnSnapPt(6.05, 3.04);          /* 既存の角の y=3 にそろえたい */
    return {g, hit:nnAlignHit&&nnAlignHit.lines.map(l=>l.axis+":"+l.val).join(",")};
  });
  console.log('④', JSON.stringify(ex));
  ok('既存の角の高さ（y=3）にそろう', Math.abs(ex.g.y-3)<1e-9, JSON.stringify(ex.g));

  /* ⑤ 遠いところではそろえない＝5度・10cmきざみのまま（効きすぎない） */
  const far=await p.evaluate(()=>{
    tool='draw'; state.polys=[];
    const bad=[];
    for(let k=0;k<720;k++){
      const th=k*0.5*Math.PI/180, r=1+(k%37)*0.13;
      drawPts=[{x:-60,y:-60},{x:2.4,y:1.3}];      /* そろえる相手を遠くへ置く */
      const prev=drawPts[1];
      const g=nnSnapPt(prev.x+Math.cos(th)*r, prev.y+Math.sin(th)*r);
      const deg=((Math.atan2(g.y-prev.y,g.x-prev.x)*180/Math.PI)+360)%360;
      const lenM=Math.hypot(g.x-prev.x,g.y-prev.y)*state.scaleM;
      if(Math.abs(deg-Math.round(deg/5)*5)>1e-4 || Math.abs(lenM-Math.round(lenM*10)/10)>1e-4)
        bad.push({deg:+deg.toFixed(3), lenM:+lenM.toFixed(3)});
    }
    drawPts=[];
    return {n:bad.length, e:bad.slice(0,3)};
  });
  console.log('⑤', JSON.stringify(far));
  ok('相手が遠いときは今までどおり5度・10cmきざみ', far.n===0, JSON.stringify(far.e));

  /* ⑥ 「ここで閉じる」の磁石は今までどおり優先される */
  const cl=await p.evaluate(()=>{
    tool='draw'; state.polys=[];
    drawPts=[{x:0,y:0},{x:8,y:0},{x:8,y:4},{x:0,y:4}];
    const s=nnSnapPt(0.05,0.08);
    return nnResolvePoint(s.x,s.y);
  });
  ok('始点の近くは「閉じる」が優先', cl.close===true && cl.g.x===0 && cl.g.y===0, JSON.stringify(cl));

  /* ⑦ 1点目は今までどおり方眼の交差点 */
  const f1=await p.evaluate(()=>{ tool='draw'; drawPts=[]; state.polys=[]; return nnSnapPt(3.42,5.61); });
  ok('1点目は方眼の交差点', f1.x===3&&f1.y===6, JSON.stringify(f1));

  /* ⑧ 直前の点の真下・真横（角度きざみ）は壊れていない */
  const cr=await p.evaluate(()=>{
    tool='draw'; state.polys=[]; const o={};
    drawPts=[{x:-40,y:-40},{x:2.4,y:1}]; o.down=nnSnapPt(2.42,4.10);
    drawPts=[{x:-40,y:-40},{x:1,y:2.3}]; o.side=nnSnapPt(5.10,2.34);
    return o;
  });
  ok('直前の点の真下（x がそろう）', Math.abs(cr.down.x-2.4)<1e-9, JSON.stringify(cr.down));
  ok('直前の点の真横（y がそろう）', Math.abs(cr.side.y-2.3)<1e-9, JSON.stringify(cr.side));

  /* ⑨ 目印の紫の線が出る（画素で確認） */
  const px=await p.evaluate(()=>{
    tool='draw'; state.polys=[]; state.active=-1;
    drawPts=[{x:0,y:0},{x:8,y:0},{x:8,y:4},{x:3,y:4}];
    const g=nnSnapPt(0.09,4.02); mouse.gx=g.x; mouse.gy=g.y; draw();
    const c=cv.getContext('2d'), d=c.getImageData(0,0,cv.width,cv.height).data;
    let n=0;
    for(let i=0;i<d.length;i+=4){
      /* 紫 #8b2fd6 に近い画素 */
      if(Math.abs(d[i]-0x8b)<40 && Math.abs(d[i+1]-0x2f)<40 && Math.abs(d[i+2]-0xd6)<40) n++;
    }
    return n;
  });
  console.log('⑨ 紫の画素', px);
  ok('そろえた目印（紫の線）が出る', px>40, px+'px');

  /* ⑩ 実際に指（またはマウス）で打って、最後の点が始点の真下に来るか */
  const real=await p.evaluate(async()=>{
    tool='draw'; state.polys=[]; state.active=-1; drawPts=[]; draw();
    const r=cv.getBoundingClientRect();
    const kx=r.width?(cv.width/devicePixelRatio)/r.width:1;
    const g2c=(gx,gy)=>({x:r.left+(gx*cellPx+ox)/kx, y:r.top+(gy*cellPx+oy)/kx});
    const isPhone=document.documentElement.getAttribute('data-nnphone')==='1';
    const AIMDX=36, AIMDY=-52;
    const tap=async(gx,gy)=>{
      const c=g2c(gx,gy);
      if(isPhone){
        const cx=c.x-AIMDX, cy=c.y-AIMDY;
        cv.dispatchEvent(new PointerEvent('pointerdown',{pointerId:1,clientX:cx,clientY:cy,bubbles:true,isPrimary:true}));
        cv.dispatchEvent(new PointerEvent('pointermove',{pointerId:1,clientX:cx,clientY:cy,bubbles:true,isPrimary:true}));
        await new Promise(r2=>setTimeout(r2,60));
        cv.dispatchEvent(new PointerEvent('pointerup',{pointerId:1,clientX:cx,clientY:cy,bubbles:true,isPrimary:true}));
      }else{
        cv.dispatchEvent(new MouseEvent('mousemove',{clientX:c.x,clientY:c.y,bubbles:true}));
        cv.dispatchEvent(new MouseEvent('mousedown',{clientX:c.x,clientY:c.y,bubbles:true,button:0}));
        cv.dispatchEvent(new MouseEvent('mouseup',{clientX:c.x,clientY:c.y,bubbles:true,button:0}));
      }
      await new Promise(r2=>setTimeout(r2,50));
    };
    await tap(0,0); await tap(8,0); await tap(8,4);
    await tap(3,4);
    await tap(0.09,4.02);                    /* 始点の真下を「だいたい」狙う */
    return {pts:drawPts.map(q=>({x:+q.x.toFixed(3),y:+q.y.toFixed(3)}))};
  });
  console.log('⑩', JSON.stringify(real.pts));
  const last=real.pts[real.pts.length-1];
  ok('実打：最後の点が始点の真下（x=0）', !!last && Math.abs(last.x-0)<1e-6, JSON.stringify(last));
  ok('実打：5点そろう', real.pts.length===5, real.pts.length+'点');

  ok('JSエラーなし', errs.length===0, errs.join(' / '));
  console.log('\n'+(PH?'【スマホたて】':'【パソコン】'));
  console.log(R.join('\n'));
  await b.close();
})();
