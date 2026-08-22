const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1100,height:720},deviceScaleFactor:2});
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>{ state.polys=state.polys.slice(0,1); dirty3d=true; d3WantFit=true; build3D(); });
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{
    const cam=T.camera, bx=new THREE.Box3().setFromObject(T.group);
    /* 添付2枚目と同じ：屋根の上・外側の角のあたりから左の辺を見下ろす */
    const tx=bx.min.x+1.2, tz=(bx.min.z+bx.max.z)/2, ty=bx.max.y-0.15;
    cam.position.set(tx+4.0, ty+2.6, tz+5.0);
    cam.lookAt(tx,ty-0.2,tz);
    cam.updateProjectionMatrix(); T.renderer.render(T.scene,cam);
  });
  await p.waitForTimeout(700);
  const w=await p.$('#three-wrap'); await w.screenshot({path:'d3_corner.png'});
  console.log('ok');
  await b.close();
})();
