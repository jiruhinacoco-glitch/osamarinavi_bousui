const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const AZ=+(process.argv[2]||0.9), EL=+(process.argv[3]||0.55), ZOOM=+(process.argv[4]||1);
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1000,height:700},deviceScaleFactor:3});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1500); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>{ state.polys=state.polys.slice(0,1); dirty3d=true; d3WantFit=true; build3D(); });
  await p.waitForTimeout(1200);
  const info=await p.evaluate(([az,el,zoom])=>{
    const bx=new THREE.Box3().setFromObject(T.group);
    // 手前の辺の中央・パラペット上端に寄る
    const tx=(bx.min.x+bx.max.x)/2, tz=bx.max.z, ty=bx.max.y-0.35;
    const d=(bx.max.x-bx.min.x)*0.16*zoom;
    const camera=T.camera, renderer=T.renderer, scene=T.scene;
    camera.position.set(tx+d*Math.cos(el)*Math.cos(az), ty+d*Math.sin(el), tz+d*Math.cos(el)*Math.sin(az));
    camera.lookAt(tx,ty,tz);
    camera.updateProjectionMatrix(); renderer.render(scene,camera);
    return {top:+bx.max.y.toFixed(2), d:+d.toFixed(2)};
  },[AZ,EL,ZOOM]);
  console.log(JSON.stringify(info));
  const w=await p.$('#three-wrap'); await w.screenshot({path:'d3_close.png'});
  console.log('errs:',errs.join('|')||'none');
  await b.close();
})();
