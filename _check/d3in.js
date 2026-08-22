const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1100,height:760},deviceScaleFactor:2});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
  await p.waitForTimeout(1800);
  // 屋根の中をのぞきこむ視点（立上りと継目を見る）
  await p.evaluate(()=>{ T.theta=-0.70; T.phi=0.98; T.r=T.r*0.42; });
  await p.waitForTimeout(600);
  const w=await p.$('#three-wrap'); await w.screenshot({path:'d3_inside.png'});
  const d=await p.evaluate(()=>{
    let bead=0, face=0;
    T.group.traverse(o=>{ if(o.isMesh){
      if(o.geometry.type==='CylinderGeometry') bead++;
      if(o.geometry.type==='PlaneGeometry') face++; }});
    return {はみ出しアス:bead, 立上り防水層:face,
      笠木:(()=>{let n=0;T.group.traverse(o=>{if(o.isMesh&&o.material.metalness>0.5)n++;});return n;})()};
  });
  console.log(JSON.stringify(d));
  await b.close();
})();
