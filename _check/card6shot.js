const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [n,vp,f] of [['land',{viewport:{width:852,height:393},deviceScaleFactor:3,isMobile:true,hasTouch:true},'_land.html'],
                         ['pc',{viewport:{width:2000,height:1010}},'kirokucho_demo.html']]){
    const p=await b.newPage(vp);
    if(n!=='pc')await p.addInitScript(()=>{try{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});}catch(e){}});
    await p.goto('http://localhost:8899/'+f); await p.waitForTimeout(2000);
    await p.evaluate(()=>showView('list')); await p.waitForTimeout(900);
    const c=await p.$('#list .pcard'); await c.screenshot({path:'shot_'+n+'.png'});
    await p.close();
  }
  await b.close(); console.log('ok');
})();
