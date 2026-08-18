const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
  const b=await chromium.launch({executablePath:EXE});
  for(const v of [[393,852,'たて'],[1600,900,'PC']]){
    const ctx=await b.newContext(v[0]<700?{viewport:{width:v[0],height:v[1]},deviceScaleFactor:2,isMobile:true,hasTouch:true}:{viewport:{width:v[0],height:v[1]}});
    if(v[0]<700) await ctx.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
    const p=await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'});
    await p.waitForTimeout(1500);
    const r=await p.evaluate(async()=>{
      showView('list'); await new Promise(z=>setTimeout(z,400));
      selectedId=props[1].id; openDetailFull(); await new Promise(z=>setTimeout(z,600));
      const mv=document.getElementById('mainview');
      const det=document.getElementById('detail');
      return {mvCls:mv.className, mvDisp:getComputedStyle(mv).display,
        detExists:!!det, detHtml:det?det.innerHTML.length:0,
        detDisp:det?getComputedStyle(det).display:null,
        detRect:det?JSON.stringify(det.getBoundingClientRect().toJSON()):null,
        listDisp:getComputedStyle(document.getElementById('list')).display};
    });
    console.log(v[2], JSON.stringify(r), 'errs:', errs.join('|').slice(0,200));
    await ctx.close();
  }
  await b.close();
})();
