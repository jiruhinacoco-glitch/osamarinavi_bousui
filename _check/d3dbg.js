const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1100,height:760}});
  p.on('pageerror',e=>console.log('PAGEERROR:',e.message));
  p.on('console',m=>{ if(m.type()==='error') console.log('CONSOLE:',m.text().slice(0,200)); });
  p.on('response',r=>{ if(/three/i.test(r.url())) console.log('RES',r.status(),r.url()); });
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.waitForTimeout(1500);
  console.log('nnLoadThree あり?', await p.evaluate(()=>typeof window.nnLoadThree));
  console.log('サンプル関数', await p.evaluate(()=>Object.keys(window).filter(k=>/sample/i.test(k))));
  await p.evaluate(()=>setTab('d3'));
  await p.waitForTimeout(2500);
  console.log('THREE?', await p.evaluate(()=>typeof THREE));
  console.log('T?', await p.evaluate(()=>typeof T!=='undefined' && !!T));
  console.log('tagのsrc', await p.evaluate(()=>{const e=document.getElementById('nn-three-tag');return e?e.src:'なし';}));
  await b.close();
})();
