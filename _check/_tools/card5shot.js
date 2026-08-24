const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for(const [mode,vp] of [['pc',{width:1600,height:900}],['phone',{width:393,height:852}]]){
  const ctx=await b.newContext({viewport:vp, deviceScaleFactor:mode==='pc'?1:2, isMobile:mode!=='pc', hasTouch:mode!=='pc'});
  const p=await ctx.newPage();
  if(mode!=='pc') await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('http://localhost:8899/kirokucho_demo.html'); await p.waitForTimeout(2200);
  await p.evaluate(()=>showView('list')); await p.waitForTimeout(1400);
  const tb=await p.evaluate(()=>{const t=document.getElementById('toolbar');
    return {disp:getComputedStyle(t).display, h:Math.round(t.getBoundingClientRect().height)};});
  console.log(mode,'toolbar:',JSON.stringify(tb));
  await p.screenshot({path:'card5b_'+mode+'.png'});
  await ctx.close();
}
await b.close();})();
