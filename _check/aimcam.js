/* ★2026-09-09g §371 打点しているとき（照準を出している最中）でも、
   2本目の指でカメラを動かせるか。本人の指示③
   「増貼りで点を決めているときも、カメラ視点位置全体の移動がしたい」。
   ★見方も実物と同じ：本物の指のイベントを投げて、カメラの値と照準の出方を見る。
   使い方: node _check/aimcam.js  ／ node _check/aimcam.js _before.html */
const FILE=process.argv[2]||'zumen_sekisan.html';
let ng=0; const ok=(c,m,x)=>{ if(!c)ng++; console.log((c?'  ○ ':'★NG ')+m+(x!==undefined?'  '+JSON.stringify(x):'')); };
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:420,height:900},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await p.addInitScript(()=>{Object.defineProperty(screen,'width',{get:()=>420});Object.defineProperty(screen,'height',{get:()=>900});});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://127.0.0.1:8899/'+FILE,{waitUntil:'load'}); await p.waitForTimeout(1600);
  await p.evaluate(()=>{try{nnZMenuClose();}catch(_){}});
  await p.evaluate(()=>{ try{localStorage.clear();}catch(_){}
    state.scaleM=1; const pts=[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}];
    state.polys=[{name:'屋根①',lv:0,pts,holes:[],edges:pts.map(()=>({h:300,w:250,k:'para'}))}];
    state.parts=[];state.d3sol=[];state.d3sheet=[];state.active=0; saveState(); setTab('d3'); });
  await p.waitForFunction(()=>{try{return typeof T!=='undefined'&&T&&T.group&&T.group.children.length>3;}catch(_){return false;}},{timeout:25000});
  await p.evaluate(()=>{ d3ViewIso(); try{nnRoofFold(true);}catch(_){} });
  await p.waitForTimeout(1500);
  await p.waitForFunction(()=>{try{return !!T.renderer.domElement._nnFaceDrag;}catch(_){return false;}},{timeout:9000});

  /* ① いちばん寄れる距離（本人の指示：もっと近づけたい） */
  const rmin=await p.evaluate(()=>{ for(let i=0;i<80;i++) d3Zoom(0.9); return +T.r.toFixed(3); });
  ok(rmin<=0.16, '① 構造体まで 0.15m まで寄れる（前は 0.6m で止まっていた）', rmin);

  await p.evaluate(()=>{ Object.assign(T,{theta:Math.PI*1.28, phi:0.85, tx:6, tz:1.0, r:5.0}); T.rev=(T.rev|0)+1; });
  await p.waitForTimeout(900);
  await p.evaluate(()=>{ state.d3sheet=[]; nnSheetStart({n:'増し張り材',col:'#3f3b36',src:'t'},'draw'); });
  await p.waitForTimeout(600);

  const TOUCH=`(t,id,x,y)=>{const el=T.renderer.domElement;
    el.dispatchEvent(new PointerEvent(t,{pointerId:id,pointerType:'touch',isPrimary:(id===11),clientX:x,clientY:y,bubbles:true,cancelable:true}));}`;
  const aimOn=()=>p.evaluate(()=>{ const d=document.getElementById('nnD3Aim')||document.querySelector('[id*="Aim"]');
    return !!(d && d.style && d.style.display!=='none' && d.offsetParent!==null); });
  const st=()=>p.evaluate(()=>({r:+T.r.toFixed(3), tx:+T.tx.toFixed(3), tz:+T.tz.toFixed(3),
    pts:(window.nnD3DrawDbg&&nnD3DrawDbg())?nnD3DrawDbg().pts.length:0}));

  /* 1点目を置く（ふつうのタップ） */
  await p.evaluate(`(${TOUCH})('pointerdown',11,210,600)`); await p.waitForTimeout(120);
  await p.evaluate(`(${TOUCH})('pointerup',11,210,600)`); await p.waitForTimeout(500);
  const s0=await st();
  ok(s0.pts>=1, '② 1点目が置ける', s0.pts);

  /* 指1で狙いを出す → 指2でピンチ（カメラを動かす） */
  await p.evaluate(`(${TOUCH})('pointerdown',11,210,620)`); await p.waitForTimeout(120);
  const a1=await aimOn();
  ok(a1, '③ 指を置くと照準が出る', a1);
  await p.evaluate(`(${TOUCH})('pointerdown',12,300,620)`); await p.waitForTimeout(80);
  const a2=await aimOn();
  ok(a2, '④ 2本目の指を置いても照準は消えない（前は消えて狙い直しだった）', a2);
  /* 2本の指を広げる＝寄る */
  for(let k=1;k<=6;k++){
    await p.evaluate(`(${TOUCH})('pointermove',11,${210-k*12},620)`);
    await p.evaluate(`(${TOUCH})('pointermove',12,${300+k*12},620)`);
    await p.waitForTimeout(40);
  }
  const s1=await st();
  ok(Math.abs(s1.r-s0.r)>0.2, '⑤ 打点の途中でもカメラが動く（寄れる）', {前:s0.r, 後:s1.r});
  ok(s1.pts===s0.pts, '⑤ カメラを動かしただけでは点は増えない', {前:s0.pts, 後:s1.pts});
  /* 2本目を離す → まだ狙える */
  await p.evaluate(`(${TOUCH})('pointerup',12,${300+6*12},620)`); await p.waitForTimeout(150);
  const a3=await aimOn();
  ok(a3, '⑥ 2本目を離すと、そのまま続きから狙える', a3);
  /* 狙って離す → 点が増える */
  await p.evaluate(`(${TOUCH})('pointermove',11,180,640)`); await p.waitForTimeout(200);
  await p.evaluate(`(${TOUCH})('pointerup',11,180,640)`); await p.waitForTimeout(500);
  const s2=await st();
  ok(s2.pts===s0.pts+1, '⑦ そのあと指を離すと点が置ける', {前:s0.pts, 後:s2.pts});

  ok(errs.length===0, 'JSエラーなし', errs.slice(0,2));
  console.log(ng?('★NG '+ng+'件'):'○ 打点の途中でもカメラを動かせる');
  await b.close();
})();
