const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const v of [[393,852,'たて'],[1600,900,'パソコン']]){
    const ctx=await b.newContext(v[0]<700
      ?{viewport:{width:v[0],height:v[1]},deviceScaleFactor:2,isMobile:true,hasTouch:true}
      :{viewport:{width:v[0],height:v[1]}});
    if(v[0]<700) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const p=await ctx.newPage();
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
    await p.waitForTimeout(1700);
    console.log(v[2], JSON.stringify(await p.evaluate(()=>{
      const Z=window.nnPZ||1, sb=document.querySelector('.stbar');
      const r=sb.getBoundingClientRect();
      const kids=[...sb.children].map(c=>Math.round(c.getBoundingClientRect().top/Z));
      const rng=sb.querySelector('.rng');
      const gaps=[...sb.children].map(c=>{const b2=c.getBoundingClientRect(); return Math.round(b2.left/Z)+'-'+Math.round(b2.right/Z);});
      return {h:Math.round(r.height/Z), rows:new Set(kids).size,
        ml:getComputedStyle(rng).marginLeft, over:sb.scrollWidth-sb.clientWidth, gaps};
    })));
    await p.close();
  }
  await b.close();
})();
