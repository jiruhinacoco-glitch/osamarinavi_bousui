const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const q=await b.newPage({viewport:{width:1280,height:720},deviceScaleFactor:2});
  await q.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await q.waitForTimeout(2500);
  await q.screenshot({path:'shots/kiroku_dash.png'}); await b.close();
})();
