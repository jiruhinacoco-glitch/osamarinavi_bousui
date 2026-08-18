const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  const p=await ctx.newPage();
  await p.goto('http://localhost:8899/_land_kirokucho_demo.html',{waitUntil:'load'});
  await p.waitForTimeout(1500);
  await p.evaluate(()=>{ showView('list');selectedId=props[1].id;openDetailFull(); });
  await p.waitForTimeout(900);
  console.log(JSON.stringify(await p.evaluate(()=>{
    const out={anims:[]};
    document.getAnimations().forEach(a=>{
      const t=a.effect&&a.effect.target;
      out.anims.push({name:a.animationName, state:a.playState, cur:a.currentTime,
        start:a.startTime, target:t?(t.tagName+'#'+t.id+'.'+String(t.className).split(' ')[0]):null});
    });
    let e=document.getElementById('detail'); const chain=[];
    while(e && e!==document.documentElement){
      const cs=getComputedStyle(e);
      chain.push({el:e.tagName+'#'+e.id, op:cs.opacity, disp:cs.display, vis:cs.visibility, cv:cs.contentVisibility});
      e=e.parentElement;
    }
    out.chain=chain;
    return out;
  }, ), null, 1));
  await b.close();
})();
