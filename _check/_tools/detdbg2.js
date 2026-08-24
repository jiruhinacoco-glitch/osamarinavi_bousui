const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1500);
  const r=await p.evaluate(async()=>{
    showView('list'); await new Promise(z=>setTimeout(z,400));
    selectedId=props[1].id; openDetailFull(); await new Promise(z=>setTimeout(z,700));
    const det=document.getElementById('detail');
    const st=getComputedStyle(det);
    const kid=det.firstElementChild; const ks=kid?getComputedStyle(kid):null;
    return {opacity:st.opacity, vis:st.visibility, transform:st.transform,
      kid:kid&&kid.className, kidOp:ks&&ks.opacity, kidDisp:ks&&ks.display,
      mvOp:getComputedStyle(document.getElementById('mainview')).opacity,
      mvAnim:getComputedStyle(document.getElementById('mainview')).animationName,
      detAnim:st.animationName,
      scale:getComputedStyle(document.querySelector('main')).transform.slice(0,40)};
  });
  console.log(JSON.stringify(r,null,1));
  await p.screenshot({path:'det_dbg.png'});
  await b.close();
})();
