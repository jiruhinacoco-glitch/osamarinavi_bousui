const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1500,height:1000},deviceScaleFactor:2});
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2400);
  const shot=async(name)=>{
    const el=await p.evaluateHandle(()=>document.querySelector('.hou-tbl').closest('.dpanel'));
    await el.asElement().scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
    await el.asElement().screenshot({path:__dirname+'/hs_'+name+'.png'});
  };
  await shot('default');
  await p.evaluate(()=>dashSortSet('hou','area')); await p.waitForTimeout(900); await shot('area');
  await p.evaluate(()=>dashSortSet('hou','n'));    await p.waitForTimeout(900); await shot('n');
  /* スマホたて */
  const m=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await m.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>393});Object.defineProperty(screen,'height',{get:()=>852});});
  await m.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await m.waitForTimeout(2400);
  await m.evaluate(()=>dashSortSet('hou','area')); await m.waitForTimeout(900);
  const e2=await m.evaluateHandle(()=>document.querySelector('.hou-tbl').closest('.dpanel'));
  await e2.asElement().scrollIntoViewIfNeeded(); await m.waitForTimeout(250);
  await e2.asElement().screenshot({path:__dirname+'/hs_phone.png'});
  const ov=await m.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  console.log('スマホ横はみ出し:',ov);
  await b.close(); console.log('shots');
})();
