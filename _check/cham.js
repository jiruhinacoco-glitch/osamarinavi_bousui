const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1000,height:520},deviceScaleFactor:3});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof THREE!=='undefined',{timeout:25000});
  await p.evaluate(()=>{
    state.scaleM=1;
    const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:7},{x:0,y:7}];
    state.polys=[{name:'屋根①', lv:0, pts, holes:[], edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; show3dWari=true; dirty3d=true; d3WantFit=true; build3D();
  });
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{
    const cam=T.camera, bx=new THREE.Box3().setFromObject(T.group);
    const set=()=>{  /* 外から・天端の少し上。面取りの斜面が見える角度 */
      cam.position.set(bx.max.x-3.2, bx.max.y+0.30, bx.max.z+0.95);
      cam.lookAt(bx.max.x-1.2, bx.max.y-0.10, bx.max.z-0.02);
      cam.updateProjectionMatrix(); T.renderer.render(T.scene,cam);
    };
    set(); window.__k=setInterval(set,16);
  });
  await p.waitForTimeout(500);
  const w=await p.$('#three-wrap'); await w.screenshot({path:'d3_cham.png'});
  console.log('errs:',errs.join('|')||'none');
  await b.close();
})();
