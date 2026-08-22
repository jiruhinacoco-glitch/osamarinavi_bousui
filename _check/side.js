const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1100,height:620},deviceScaleFactor:2});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>{ state.polys=state.polys.slice(0,1); dirty3d=true; d3WantFit=true; build3D(); });
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{
    const cam=T.camera, bx=new THREE.Box3().setFromObject(T.group);
    /* 真横・少しだけ上から（パラペットの外側の面を見る） */
    const tx=(bx.min.x+bx.max.x)/2, tz=bx.max.z, ty=bx.max.y-0.2;
    cam.position.set(tx, ty-0.45, tz+2.2);
    cam.lookAt(tx,ty-0.42,tz);
    cam.updateProjectionMatrix(); T.renderer.render(T.scene,cam);
  });
  await p.waitForTimeout(700);
  const w=await p.$('#three-wrap'); await w.screenshot({path:'d3_side.png'});
  console.log('ok');
  await b.close();
})();
