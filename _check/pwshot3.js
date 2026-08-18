const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:900,height:420},deviceScaleFactor:6});
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2400);
  const el=(await p.$$('.httl'))[0];
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(400);
  const r=await el.boundingBox();
  await p.screenshot({path:'pw_pill3.png',clip:{x:Math.max(0,r.x-14),y:Math.max(0,r.y-16),width:Math.min(400,900-r.x+14),height:r.height+34}});
  console.log('ok',JSON.stringify(r));
  await b.close();
})();
