const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1200,height:900},deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
  const el=(await p.$$('.dpanel'))[0]; await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const r=await el.boundingBox();
  await p.screenshot({path:'pf1.png',clip:{x:Math.max(0,r.x-14),y:Math.max(0,r.y-14),width:Math.min(760,r.width+28),height:Math.min(420,r.height+28)}});
  console.log('JSエラー',errs.length?errs:'なし');
  await b.close();
})();
