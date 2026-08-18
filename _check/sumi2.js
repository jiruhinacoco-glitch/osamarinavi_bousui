const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1000,height:620},deviceScaleFactor:3});
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
    const set=()=>{  /* 出隅の外から斜めに寄る＝縦の角がよく見える */
      cam.position.set(bx.max.x+1.15, bx.max.y+0.22, bx.max.z+1.05);
      cam.lookAt(bx.max.x-0.18, bx.max.y-0.16, bx.max.z-0.18);
      cam.updateProjectionMatrix(); T.renderer.render(T.scene,cam);
    };
    set(); window.__k=setInterval(set,16);
  });
  await p.waitForTimeout(500);
  const w=await p.$('#three-wrap'); await w.screenshot({path:'d3_sumi2.png'});
  console.log('errs:',errs.join('|')||'none');
  await b.close();
})();
