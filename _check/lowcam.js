/* 低いカメラ（目線の高さ）で、入隅に「平場→立上り→立上り→平場」の増し張りをかく（§348）
   本人の動画（2026-09-08 18:44）＝点が打てず、細い短冊になった場面。
   使い方: node _check/lowcam.js  ／ node _check/lowcam.js _before.html（直す前と比べる）
   ★照準のずれ（+36,-52px・§156）を引いてタップすること。引かないと狙いと別の場所を押す。 */
const FILE=process.argv[2]||'zumen_sekisan.html';
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:420,height:900},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>420});Object.defineProperty(screen,'height',{get:()=>900});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE,{waitUntil:'load'});
  await p.waitForTimeout(1800); await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1; const pts=[{x:0,y:0},{x:16,y:0},{x:16,y:12},{x:0,y:12}];
    state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:600,w:250,k:'para'}))}];
    state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0; state.genkyo='body'; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:25000});
  /* ★カメラを「目線の高さ」に（パラペットの上端 0.6m より低い） */
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){}
    T.theta=Math.PI*0.25; T.phi=1.545; T.tx=1.2; T.tz=1.2; T.r=2.2; T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(1800);
  const camY=await p.evaluate(()=>+T.camera.position.y.toFixed(3));
  ok(camY<0.6, '① カメラがパラペットの上端より低い（＝狙いが平面と交わらない場面）', camY);
  await p.evaluate(()=>{ nnSheetStart({n:'ポリマリット',col:'#3f3b36',src:'t'},'draw'); });
  await p.waitForTimeout(700);
  await p.waitForFunction(()=>{try{return !!T.renderer.domElement._nnFaceDrag;}catch(_){return false;}},{timeout:9000});
  const settle=async()=>{ await p.waitForFunction(()=>{ try{ const el=T.renderer.domElement;
      const k=[T.camera.position.x,T.camera.position.y,T.camera.position.z,el.clientWidth,el.clientHeight].map(v=>Math.round(v*100)).join(',');
      window.__n=(window.__p===k)?(window.__n||0)+1:0; window.__p=k; return (window.__n||0)>=5; }catch(_){return false;} },{timeout:18000}).catch(()=>{}); await p.waitForTimeout(150); };
  const SCR=async(x,y,z)=>{ await settle(); return p.evaluate(([x,y,z])=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(x,y,z).project(T.camera); return {x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height}; },[x,y,z]); };
  const CL=[[1.2,0.012,0.9],[0.9,0.55,0.26],[0.26,0.55,0.9],[0.6,0.012,1.2]];
  for(const q of CL){ const c=await SCR(...q);
    await p.touchscreen.tap(c.x-36,c.y+52); await p.waitForTimeout(420); }
  const n=await p.evaluate(()=>{ const d=nnD3DrawDbg&&nnD3DrawDbg(); return d?d.pts.length:0; });
  ok(n===4, '② 4点とも打てる（平面と交わらない壁の上でも点が置ける）', n);
  const c0=await SCR(...CL[0]); await p.touchscreen.tap(c0.x-36,c0.y+52); await p.waitForTimeout(1300);
  const r=await p.evaluate(()=>{ const s=state.d3sheet[0]; if(!s) return {none:1};
    const ar=s.faces.map(f=>+(f.am||0).toFixed(4));
    return { n:s.faces.length, area:+ar.reduce((a,b)=>a+b,0).toFixed(3),
      kinds:s.faces.map(f=>f.id&&f.id.k), ar, sliver:ar.filter(v=>v<0.0004).length }; });
  ok(!r.none, '③ 増し張りができる', r);
  ok(r.n>=3, '③ 平場と2つの壁に貼れている（3面以上）', r.n);
  ok(r.kinds&&r.kinds.indexOf('deck')>=0&&r.kinds.filter(k=>k==='wall').length>=2,
     '③ 平場＋2つの立上りにまたがる', r.kinds);
  ok(r.area>1.2&&r.area<3.0, '③ 面積がまとも（1.2〜3.0㎡）', r.area);
  /* ★2026-09-09c しきい値は 0.02㎡(200c㎡) になっていたが、面取り（20mm）の面は
     まともに貼れていても 50〜100c㎡ しかない＝正しい面まで「短冊」に数えていた。
     見たいのは「幅ゼロの切れはし」なので、札のとおり 4c㎡ で見る。 */
  ok(r.sliver===0, '③ 細い短冊（4c㎡未満）が無い', {sliver:r.sliver, ar:r.ar});
  ok(errs.length===0, 'JSエラーなし', errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 0件');
  await b.close();
})();
