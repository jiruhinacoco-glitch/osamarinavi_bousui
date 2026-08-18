/* スマホ（赤い照準）でも、直前の点の真下にまっすぐ引けるか */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));

(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
  await p.waitForTimeout(1400);

  const AIM_DX=36, AIM_DY=-52;
  const place=async(gx,gy)=>{
    const c=await p.evaluate(({gx,gy})=>{
      const r=cv.getBoundingClientRect();
      const kx=r.width?(cv.width/devicePixelRatio)/r.width:1;
      const ky=r.height?(cv.height/devicePixelRatio)/r.height:1;
      return {x:r.left+(ox+gx*cellPx)/kx, y:r.top+(oy+gy*cellPx)/ky};
    },{gx,gy});
    /* 照準は指の「右上 +36 / -52」に出るので、指はその逆へ置く */
    const fx=c.x-AIM_DX, fy=c.y-AIM_DY;
    await p.evaluate(({fx,fy})=>{
      const mk=(t,x,y)=>cv.dispatchEvent(new PointerEvent(t,{pointerId:1,pointerType:'touch',
        isPrimary:true,clientX:x,clientY:y,bubbles:true,cancelable:true}));
      mk('pointerdown',fx,fy); mk('pointermove',fx,fy); mk('pointerup',fx,fy);
    },{fx,fy});
    await p.waitForTimeout(220);
  };

  await p.evaluate(()=>{ tool='draw'; drawPts=[{x:0,y:0},{x:2.4,y:1}]; draw(); });
  await place(2.46, 5.05);                      /* 直前の点のほぼ真下を狙う */
  const g1=await p.evaluate(()=>drawPts.map(q=>({x:q.x,y:q.y})));
  console.log('真下:',JSON.stringify(g1));
  ok('照準（指）でも完全な垂直線', g1.length===3 && g1[2].x===2.4, JSON.stringify(g1[2]||{}));

  await p.evaluate(()=>{ drawPts=[{x:0,y:0},{x:1,y:2.3}]; draw(); });
  await place(4.05, 2.36);                      /* 直前の点のほぼ真横を狙う */
  const g2=await p.evaluate(()=>drawPts.map(q=>({x:q.x,y:q.y})));
  console.log('真横:',JSON.stringify(g2));
  ok('照準（指）でも完全な水平線', g2.length===3 && g2[2].y===2.3, JSON.stringify(g2[2]||{}));

  await p.evaluate(()=>{ drawPts=[{x:0,y:0},{x:2.4,y:1}]; draw(); });
  await place(5.1, 5.1);                        /* 斜めはそのまま */
  const g3=await p.evaluate(()=>drawPts.map(q=>({x:q.x,y:q.y})));
  console.log('斜め:',JSON.stringify(g3));
  const d3=g3.length===3 ? ((Math.atan2(g3[2].y-g3[1].y,g3[2].x-g3[1].x)*180/Math.PI)+360)%360 : -1;
  ok('斜めは5度きざみで自由に引ける', Math.abs(d3-Math.round(d3/5)*5)<1e-4, d3.toFixed(2)+'度');

  ok('JSエラーなし', errs.length===0, errs[0]||'');
  console.log(R.join('\n'));
  console.log(R.some(x=>x.startsWith('★'))?'★ NG あり':'すべて○');
  await b.close();
})();
