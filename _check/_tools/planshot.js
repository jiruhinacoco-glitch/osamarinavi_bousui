const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const U='file:///tmp/claude-0/-home-user-osamarinavi-bousui/14021813-84a1-5c50-96c6-9a3eca49d2e3/scratchpad/plan/nn_keikaku.html';
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await p.goto(U,{waitUntil:'load'}); await p.waitForTimeout(500);
  await p.click('button:has-text("今日の3つを作る")'); await p.waitForTimeout(300);
  await p.screenshot({path:__dirname+'/pl_today.png'});
  const pc=await b.newPage({viewport:{width:1400,height:1000}});
  await pc.goto(U,{waitUntil:'load'}); await pc.waitForTimeout(500);
  for(const [k,f] of [['road','pl_road'],['calc','pl_calc'],['kpi','pl_kpi'],['idea','pl_idea']]){
    await pc.evaluate(x=>go(x),k); await pc.waitForTimeout(350);
    await pc.screenshot({path:__dirname+'/'+f+'.png'});
  }
  await b.close(); console.log('shots');
})();
