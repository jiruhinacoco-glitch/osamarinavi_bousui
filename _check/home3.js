const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const OUT='/tmp/claude-0/-home-user-osamarinavi-bousui/b1be0cae-0477-5376-b744-be793bfc684f/scratchpad/out';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [w,h,name] of [[852,393,'land'],[393,852,'port']]){
    const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const p=await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8899/index.html',{waitUntil:'load'}); await p.waitForTimeout(2200);
    const r=await p.evaluate(()=>{
      const bs=[...document.querySelectorAll('.bukken-banner')].map(e=>{const r=e.getBoundingClientRect();return {t:e.textContent.trim(),x:Math.round(r.left),y:Math.round(r.top),h:Math.round(r.height)};});
      const co=document.querySelector('.company').textContent.trim();
      const fu=document.querySelector('.fusen').textContent.replace(/\s+/g,' ').trim();
      return {co,bs,fu, ov:document.documentElement.scrollWidth-innerWidth};
    });
    console.log(name, JSON.stringify(r), errs.length?errs:'' );
    await p.screenshot({path:OUT+'/chk_home_'+name+'.png'});
    await ctx.close();
  }
  await b.close();
})();
