const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:852,height:393},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1400);
  await p.evaluate(()=>{ loadSample(); setTab('wf'); });
  await p.waitForTimeout(900);
  await p.screenshot({path:__dirname+'/f4_wf_off.png'});
  await p.evaluate(()=>nnSetWfDim(true)); await p.waitForTimeout(500);
  await p.screenshot({path:__dirname+'/f4_wf_on.png'});
  await p.evaluate(()=>{ nnSetWfDim(false); setTab('d3'); const t=document.getElementById('navShowTab'); if(t)t.style.display='block'; });
  await p.waitForTimeout(1200);
  await p.screenshot({path:__dirname+'/f4_d3.png'});
  await b.close(); console.log('shots');
})();
