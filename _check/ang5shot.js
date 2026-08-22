const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1400); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{
    tool='draw'; drawPts=[];
    /* 1点目は交差点。そのあと 0度→95度→115度 と5度きざみで引いてみる */
    const step=(pv,deg,Lm)=>{const t=deg*Math.PI/180,L=Lm/state.scaleM;
      return {x:+(pv.x+Math.cos(t)*L).toFixed(6), y:+(pv.y+Math.sin(t)*L).toFixed(6)};};
    let p0={x:6,y:4}; drawPts.push(p0);
    let p1=step(p0,0,2.0);   drawPts.push(p1);
    let p2=step(p1,95,1.5);  drawPts.push(p2);
    let p3=step(p2,115,1.2); drawPts.push(p3);
    mouse.gx=p3.x; mouse.gy=p3.y; draw();
  });
  await p.waitForTimeout(300);
  await p.screenshot({path:__dirname+'/ang5.png'});
  await b.close(); console.log('shot');
})();
