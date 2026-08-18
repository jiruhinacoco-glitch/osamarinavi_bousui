const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const v of [[393,852,'たて'],[852,393,'よこ']]){
    const ctx=await b.newContext({viewport:{width:v[0],height:v[1]},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const p=await ctx.newPage();
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
    await p.waitForTimeout(1700);
    await p.evaluate(()=>openModal()); await p.waitForTimeout(500);
    console.log(v[2], JSON.stringify(await p.evaluate(()=>{
      const m=document.querySelector('#modalbg .modal'), r=m.getBoundingClientRect();
      const nm=document.getElementById('f_name').getBoundingClientRect();
      return {top:Math.round(r.top), h:Math.round(r.height), vh:innerHeight,
        nameVisible:nm.top>=0&&nm.bottom<=innerHeight,
        font:getComputedStyle(document.getElementById('f_name')).fontSize,
        scroll:m.scrollHeight-m.clientHeight};
    })));
    await p.close();
  }
  await b.close();
})();
