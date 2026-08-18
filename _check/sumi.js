const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const D=+(process.argv[2]||2.2), EL=+(process.argv[3]||0.55), AZ=+(process.argv[4]||0.9);
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1000,height:700},deviceScaleFactor:3});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1500);
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof THREE!=='undefined',{timeout:25000});
  /* 4辺ともパラペットの、まっさらな長方形 */
  await p.evaluate(()=>{
    state.scaleM=1;
    const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:7},{x:0,y:7}];
    state.polys=[{name:'屋根①', lv:0, pts, holes:[], edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; show3dWari=true; dirty3d=true; d3WantFit=true; build3D();
  });
  await p.waitForTimeout(1200);
  await p.evaluate(([d,el,az])=>{
    const cam=T.camera, bx=new THREE.Box3().setFromObject(T.group);
    const cx=bx.max.x, cz=bx.max.z, cy=bx.max.y-0.15;   /* 出隅（角） */
    /* 屋根の内側から出隅を見る */
    cam.position.set(cx-d*Math.cos(az), cy+d*el, cz-d*Math.sin(az));
    cam.lookAt(cx-0.10,cy-0.16,cz-0.10);
    cam.updateProjectionMatrix(); T.renderer.render(T.scene,cam);
  },[D,EL,AZ]);
  await p.waitForTimeout(700);
  const w=await p.$('#three-wrap'); await w.screenshot({path:'d3_sumi.png'});
  console.log('errs:',errs.join('|')||'none');
  await b.close();
})();
