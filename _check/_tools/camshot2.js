const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  /* PC：描いている途中（予告線＋光る線） */
  const p=await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
  await p.goto('http://localhost:8899/camera.html',{waitUntil:'load'});
  await p.waitForTimeout(1000);
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(700);
  const t=await p.evaluate(()=>{const r=cv.getBoundingClientRect();
    return {x:r.left, y:r.top, w:r.width, h:r.height};});
  await p.mouse.click(t.x+t.w*0.18, t.y+t.h*0.52);
  await p.mouse.click(t.x+t.w*0.45, t.y+t.h*0.47);
  await p.mouse.move(t.x+t.w*0.72, t.y+t.h*0.60);
  await p.waitForTimeout(300);
  const el=await p.$('.canvas-wrap'); await el.screenshot({path:'cam_draw.png'});
  await p.close();
  /* スマホ：照準が出ている瞬間 */
  const ctx2=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx2.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const q=await ctx2.newPage();
  await q.goto('http://localhost:8899/camera.html',{waitUntil:'load'});
  await q.waitForTimeout(1000);
  await q.evaluate(()=>loadSample()); await q.waitForTimeout(700);
  await q.evaluate(async()=>{
    const r=cv.getBoundingClientRect();
    const fire=(type,cx,cy)=>cv.dispatchEvent(new PointerEvent(type,{pointerId:9,pointerType:'touch',clientX:cx,clientY:cy,bubbles:true,isPrimary:true}));
    fire('pointerdown', r.left+r.width*0.3, r.top+r.height*0.75);
    fire('pointermove', r.left+r.width*0.35, r.top+r.height*0.72);
  });
  await q.waitForTimeout(250);
  const el2=await q.$('.canvas-wrap'); await el2.screenshot({path:'cam_aim.png'});
  await b.close(); console.log('saved');
})();
