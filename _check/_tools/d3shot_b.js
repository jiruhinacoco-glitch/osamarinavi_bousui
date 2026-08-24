const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1100,height:780},deviceScaleFactor:2});
  await p.goto('http://localhost:8899/__before.html',{waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
  await p.evaluate(()=>setTab('d3')); await p.waitForTimeout(2600);
  // 斜め・寄りの視点で撮る
  await p.evaluate(()=>{ T.theta=-0.75; T.phi=1.12; T.r=T.r*0.72; }); await p.waitForTimeout(500);
  const w=await p.$('#three-wrap'); await w.screenshot({path:process.argv[2]||'d3_v1.png'});
  console.log('撮った', process.argv[2]||'d3_v1.png');
  await b.close();
})();
