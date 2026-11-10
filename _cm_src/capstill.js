const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  // 静止画
  const q=await b.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1.5});
  await q.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await q.waitForTimeout(2500);
  await q.screenshot({path:'shots/kiroku_dash.png'});
  try{ await q.getByText('現場一覧',{exact:true}).first().click(); await q.waitForTimeout(2500); await q.screenshot({path:'shots/kiroku_list.png'}); }catch(e){console.log('list NG',e.message.slice(0,100));}
  await q.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await q.waitForTimeout(1500); await q.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await q.evaluate(()=>loadSample()); await q.waitForTimeout(6000);
  await q.screenshot({path:'shots/plan.png'});
  await q.goto('http://localhost:8899/index.html',{waitUntil:'load'}); await q.waitForTimeout(2500);
  await q.screenshot({path:'shots/home.png'});
  await q.close();
  await b.close();
})();
