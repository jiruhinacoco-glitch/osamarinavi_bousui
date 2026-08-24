const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
  const p=await b.newPage({viewport:{width:1200,height:900},deviceScaleFactor:6});
  await p.goto('http://localhost:8899/kirokucho_demo.html',{waitUntil:'load'}); await p.waitForTimeout(2500);
  const el=(await p.$$('#dashboard .dpanel'))[0]; await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  const r=await el.boundingBox();
  await p.screenshot({path:'pf_c_tl.png',clip:{x:r.x-6,y:r.y-6,width:80,height:66}});
  await p.screenshot({path:'pf_c_br.png',clip:{x:r.x+r.width-74,y:r.y+r.height-60,width:80,height:66}});
  console.log('ok');
  await b.close();
})();
