const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BACK=+(process.argv[2]||3.0), UP=+(process.argv[3]||1.6);
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1000,height:700},deviceScaleFactor:3});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
  await p.waitForTimeout(1800);
  await p.evaluate(()=>{ state.polys=state.polys.slice(0,1); dirty3d=true; d3WantFit=true; build3D(); });
  await p.waitForTimeout(1200);
  const info=await p.evaluate(([back,up])=>{
    const cam=T.camera, ren=T.renderer, sc=T.scene;
    const bx=new THREE.Box3().setFromObject(T.group);
    const top=bx.max.y;                     // パラペット天端
    const tx=(bx.min.x+bx.max.x)/2, tz=bx.max.z-0.35;  // 手前の立上りの内側
    const ty=top-0.55;
    cam.position.set(tx-back*0.35, ty+up, tz-back);   // 屋根の内側・少し上から
    cam.lookAt(tx,ty-0.25,tz);
    cam.updateProjectionMatrix(); ren.render(sc,cam);
    return {top:+top.toFixed(2)};
  },[BACK,UP]);
  console.log(JSON.stringify(info));
  const w=await p.$('#three-wrap'); await w.screenshot({path:'d3_in2.png'});
  console.log('errs:',errs.join('|')||'none');
  await b.close();
})();
