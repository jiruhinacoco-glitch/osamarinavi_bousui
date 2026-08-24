const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1000,height:700}});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8899/zumen_sekisan.html',{waitUntil:'load'}); await p.waitForTimeout(1400); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>loadSample()); await p.waitForTimeout(400);
  await p.evaluate(()=>setTab('d3'));
  await p.waitForFunction(()=>typeof T!=='undefined'&&T&&T.group&&T.group.children.length>0,{timeout:25000});
  await p.waitForTimeout(1400);
  const d=await p.evaluate(()=>{
    let flat=0, vert=0, horizUp=0, minY=1e9;
    const box=new THREE.Box3();
    T.group.traverse(o=>{ if(o.isMesh && o.geometry.type==='CylinderGeometry'){
      box.setFromObject(o);
      const h=box.max.y-box.min.y, w=Math.max(box.max.x-box.min.x, box.max.z-box.min.z);
      if(h>w) vert++; else if(box.min.y>0.25) horizUp++; else flat++;
    }});
    // 平場の色
    let memCol=null;
    T.group.traverse(o=>{ if(!memCol && o.isMesh && o.geometry.type==='ShapeGeometry') memCol='#'+o.material.color.getHexString(); });
    return {平場の継目:flat, 立上りの縦の継目:vert, 立上りの横の継目:horizUp, 防水層の色:memCol};
  });
  console.log(JSON.stringify(d,null,0));
  console.log('JSエラー', errs.length?errs:'なし');
  await b.close();
})();
