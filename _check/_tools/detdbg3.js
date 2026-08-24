const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/_land_kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1500);
  /* shootall と同じ：1回の eval で同期実行 */
  await p.evaluate(()=>{ showView('list');selectedId=props[1].id;openDetailFull(); });
  await p.waitForTimeout(900);
  const r=await p.evaluate(()=>{
    const det=document.getElementById('detail');
    const mv=document.getElementById('mainview');
    return {mvCls:mv.className, detLen:det?det.innerHTML.length:0,
      detRect:det?Math.round(det.getBoundingClientRect().height):null,
      detTop:det?Math.round(det.getBoundingClientRect().top):null,
      mvRect:Math.round(mv.getBoundingClientRect().height),
      mvOverflow:getComputedStyle(mv).overflowY, mvScroll:mv.scrollTop,
      detDisp:det?getComputedStyle(det).display:null,
      listDisp:getComputedStyle(document.getElementById('list')).display,
      detFirst:det&&det.firstElementChild?det.firstElementChild.className:null,
      anims:[...document.getAnimations()].length};
  });
  console.log(JSON.stringify(r), 'errs:', errs.join('|').slice(0,300));
  await p.screenshot({path:'det_dbg3.png'});
  await b.close();
})();
