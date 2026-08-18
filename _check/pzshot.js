const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const [w,h,n] of [[1920,1080,'1920'],[2560,1440,'2560']]){
    const p=await b.newPage({viewport:{width:w,height:h}});
    await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2400);
    await p.screenshot({path:__dirname+'/pz_'+n+'.png'});
    await p.close();
  }
  console.log('shots');
  await b.close();
})();
