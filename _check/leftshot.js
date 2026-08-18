const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  for(const f of ['index','kirokucho_demo','genba_map_v36','library']){
    const p=await b.newPage({viewport:{width:1600,height:900}});
    await p.goto('http://localhost:8899/'+f+'.html',{waitUntil:'load'});
    await p.waitForTimeout(1800);
    await p.screenshot({path:__dirname+'/ln_'+f+'.png'});
    await p.close();
  }
  await b.close(); console.log('shots');
})();
