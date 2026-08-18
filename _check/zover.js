const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const f of ['_prev_zumen','zumen_sekisan']){
    const ctx=await b.newContext({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const p=await ctx.newPage();
    await p.goto('http://localhost:8899/'+f+'.html',{waitUntil:'load'});
    await p.waitForTimeout(1400);
    console.log(f, JSON.stringify(await p.evaluate(()=>{
      const over=document.body.scrollWidth-innerWidth;
      let culprit=null;
      document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();
        if(r.right>innerWidth+40 && r.width>100 && !culprit) culprit=e.tagName+'#'+e.id+'.'+String(e.className).split(' ')[0]+' r='+Math.round(r.right);});
      return {over, culprit};
    })));
    await ctx.close();
  }
  await b.close();
})();
