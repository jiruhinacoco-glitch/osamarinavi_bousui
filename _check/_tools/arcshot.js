/* 弧（2D）と、面の上にかいた自由な形（3D）の見た目を撮る。合否は出さない道具 */
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:1200,height:820}});
  await p.goto('http://localhost:8899/zumen_sekisan.html'); await p.waitForTimeout(1300);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ state.scaleM=1;
    state.polys=[{name:'屋根①', lv:0, pts:[{x:0,y:0},{x:20,y:0},{x:20,y:12},{x:0,y:12}],
      edges:[0,1,2,3].map(()=>({h:300,w:250,k:'para'}))}];
    state.active=0; sel={p:0,r:-1,e:0}; saveState(); recalc();
    nnEdgeArc(2500); sel=null; nnFitView&&nnFitView(); draw(); });
  await p.waitForTimeout(400);
  await p.screenshot({path:'/tmp/arc2d.png'});
  await p.evaluate(()=>{ setTab('d3'); });
  await p.waitForFunction(()=>{ try{ return typeof T!=='undefined'&&T&&T.renderer; }catch(_){return false;} },null,{timeout:20000});
  await p.waitForTimeout(1200);
  await p.evaluate(()=>{ d3ViewIso&&d3ViewIso(); });
  await p.waitForTimeout(900);
  await p.screenshot({path:'/tmp/arc3d.png'});
  /* 面の上に自由な形をかいて押し出す */
  await p.evaluate(async()=>{
    window.nnNumAsk=function(t,d,cb){ cb(String(window.__ans!=null?window.__ans:d)); };
    setTool('draw');
  });
  const pts=await p.evaluate(()=>{
    const el=T.renderer.domElement, r=el.getBoundingClientRect();
    return [[5,4],[9,4],[9,8],[7,8],[7,6],[5,6]].map(q=>{
      const w=new THREE.Vector3(q[0],0.02,q[1]).project(T.camera);
      return {x:Math.round(r.left+(w.x+1)/2*r.width), y:Math.round(r.top+(-w.y+1)/2*r.height)}; });
  });
  await p.mouse.click(pts[0].x,pts[0].y); await p.waitForTimeout(150);
  await p.evaluate(()=>nnD3PolyStart());
  for(let i=1;i<pts.length;i++){ await p.mouse.click(pts[i].x,pts[i].y); await p.waitForTimeout(120); }
  await p.evaluate(async()=>{ window.__ans=800; nnD3PolyClose(); nnSolAsk('out');
    await new Promise(r=>setTimeout(r,400)); });
  await p.waitForTimeout(700);
  await p.screenshot({path:'/tmp/poly3d.png'});
  /* 階段 */
  await p.evaluate(async()=>{ nnStamp('kaidan'); nnPlaceAtGrid(14,7);
    try{ dirty3d=true; build3D(); }catch(_){}
    await new Promise(r=>setTimeout(r,700)); });
  await p.waitForTimeout(900);
  await p.screenshot({path:'/tmp/kaidan3d.png'});
  console.log('撮りました /tmp/arc2d.png /tmp/arc3d.png /tmp/poly3d.png /tmp/kaidan3d.png');
  await b.close();
})();
