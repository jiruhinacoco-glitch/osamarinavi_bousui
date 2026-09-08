/* ★本人の付箋①〜④のとおりの動き（2026-09-08ae・§351）
   入隅で 左の壁 → 右の壁 → 平場 → 平場 とタップして閉じる
   ＝ 線が角で折れて面に貼り付き、閉じると 平場1面＋立上り2面 に巻ける。
   使い方: node _check/kado4.js  ／ node _check/kado4.js _before.html（直す前と比べる） */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
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
    state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:25000});
  /* 屋根の上に立って入隅(0,0)を見る（付箋と同じ見え方） */
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){}
    T.theta=Math.PI*0.25; T.phi=1.33; T.tx=1.1; T.tz=1.1; T.r=3.9; T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(1800);
  await p.evaluate(()=>{ nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
  await p.waitForTimeout(700);
  await p.waitForFunction(()=>{try{return !!T.renderer.domElement._nnFaceDrag;}catch(_){return false;}},{timeout:9000});
  const settle=async()=>{ await p.waitForFunction(()=>{ try{ const el=T.renderer.domElement;
      const k=[T.camera.position.x,T.camera.position.y,T.camera.position.z,el.clientWidth,el.clientHeight].map(v=>Math.round(v*100)).join(',');
      window.__n=(window.__p===k)?(window.__n||0)+1:0; window.__p=k; return (window.__n||0)>=5; }catch(_){return false;} },{timeout:18000}).catch(()=>{}); await p.waitForTimeout(150); };
  const SCR=async(x,y,z)=>{ await settle(); return p.evaluate(([x,y,z])=>{ const el=T.renderer.domElement,r=el.getBoundingClientRect();
      const q=new THREE.Vector3(x,y,z).project(T.camera); return {x:r.left+(q.x*0.5+0.5)*r.width,y:r.top+(-q.y*0.5+0.5)*r.height}; },[x,y,z]); };
  /* ① 左の壁（x=0.25面） ② 右の壁（z=0.25面） ③④ 平場 */
  const CL=[[0.256,0.42,0.95],[0.95,0.42,0.256],[1.35,0.012,0.6],[0.6,0.012,1.35]];
  const shot=async(n)=>{ await p.screenshot({path:'/tmp/kado4_'+n+'.png'}); };
  for(let i=0;i<CL.length;i++){ const c=await SCR(...CL[i]);
    await p.touchscreen.tap(c.x-36,c.y+52); await p.waitForTimeout(500);
    const nn=await p.evaluate(()=>{ const d=nnD3DrawDbg&&nnD3DrawDbg(); return d?d.pts.length:0; });
    ok(nn===i+1, '① 点'+(i+1)+'が置ける（'+(i<2?'立上りの面':'平場')+'）', nn);
    if(i===0) await shot(1); if(i===1) await shot(2); if(i===3) await shot(3); }
  const c0=await SCR(...CL[0]); await p.touchscreen.tap(c0.x-36,c0.y+52); await p.waitForTimeout(1500);
  await shot(4);
  const r=await p.evaluate(()=>{ const s=state.d3sheet[0]; if(!s) return {none:1};
    const ar=s.faces.map(f=>+(f.am||0).toFixed(4));
    return {n:s.faces.length, area:+ar.reduce((a,b)=>a+b,0).toFixed(3),
      kinds:s.faces.map(f=>f.id&&f.id.k), tiny:ar.filter(v=>v<0.02).length}; });
  ok(!r.none, '② 閉じると増し張りができる', r);
  ok(r.kinds && r.kinds.indexOf('deck')>=0 && r.kinds.filter(k=>k==='wall').length>=2,
     '③ 平場1面＋立上り2面に巻ける（付箋④）', r.kinds);
  ok(r.tiny===0, '④ 面積ゼロのかけら（細い短冊）が無い', r.tiny);
  ok(r.area>1.2 && r.area<3.0, '⑤ 面積がまとも（1.2〜3.0㎡）', r.area);
  ok(errs.length===0, 'JSエラーなし', errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 0件');
  await b.close();
})();
