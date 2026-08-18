const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'});
  await p.waitForTimeout(1400);
  await p.evaluate(()=>{
    tool='draw'; state.polys=[]; state.active=-1;
    drawPts=[{x:0,y:0},{x:8,y:0},{x:8,y:4},{x:3.37,y:4.13}];
    const g=nnSnapPt(0.09,4.02); mouse.gx=g.x; mouse.gy=g.y; nnAim.on=false; draw();
  });
  await p.screenshot({path:'align_shot.png'});
  await b.close(); console.log('saved');
})();
