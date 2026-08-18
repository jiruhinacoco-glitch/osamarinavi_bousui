const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const R=[]; const ok=(n,c,ex)=>R.push((c?'○':'★NG')+' '+n+(ex!==undefined?'  '+ex:''));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
  await p.waitForTimeout(1500);
  const before=await p.evaluate(()=>({phi:+T.phi.toFixed(4), theta:+T.theta.toFixed(4), r:+T.r.toFixed(3)}));
  /* 2本指でつまむ（指は上下にも少し動く＝実機と同じ） */
  const el=await p.$('#three-wrap'); const bb=await el.boundingBox();
  const cx=bb.x+bb.width/2, cy=bb.y+bb.height/2;
  await p.evaluate(([cx,cy])=>{
    const el=document.querySelector('#three-wrap canvas')||document.querySelector('#three-wrap');
    const mk=(t,id,x,y)=>el.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',
      clientX:x,clientY:y,bubbles:true,cancelable:true}));
    mk('pointerdown',1,cx-40,cy);   mk('pointerdown',2,cx+40,cy);
    /* 広げながら、指が上に30pxずれる（実機でよく起こる） */
    for(let i=1;i<=6;i++){ const d=40+i*12, dy=-i*5;
      mk('pointermove',1,cx-d,cy+dy); mk('pointermove',2,cx+d,cy+dy); }
    mk('pointerup',1,cx-112,cy-30); mk('pointerup',2,cx+112,cy-30);
  },[cx,cy]);
  await p.waitForTimeout(500);
  const after=await p.evaluate(()=>({phi:+T.phi.toFixed(4), theta:+T.theta.toFixed(4), r:+T.r.toFixed(3)}));
  console.log('前',JSON.stringify(before),'後',JSON.stringify(after));
  ok('2本指で拡大される', after.r < before.r*0.9, before.r+' → '+after.r);
  ok('傾き（アングル）は動かない', after.phi===before.phi, before.phi+' → '+after.phi);
  ok('向きも動かない', after.theta===before.theta, before.theta+' → '+after.theta);
  ok('JSエラーなし', errs.length===0, errs[0]||'');
  console.log(R.join('\n'));
  await b.close();
})();
