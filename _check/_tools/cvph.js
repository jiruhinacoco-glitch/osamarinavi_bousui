const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const v of [[393,852,'たて'],[852,393,'よこ']]){
    const ctx=await b.newContext({viewport:{width:v[0],height:v[1]},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const p=await ctx.newPage();
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
    await p.waitForTimeout(1800);
    await p.evaluate(()=>showView('list')); await p.waitForTimeout(1000);
    console.log(v[2], JSON.stringify(await p.evaluate(()=>{
      const c=[...document.querySelectorAll('#list .pcard')];
      return {h0:Math.round(c[0].getBoundingClientRect().height), h1:Math.round(c[1].getBoundingClientRect().height),
        h99:Math.round(c[99].getBoundingClientRect().height), scrollH:document.getElementById('list').scrollHeight};
    })));
    await p.close();
  }
  await b.close();
})();
